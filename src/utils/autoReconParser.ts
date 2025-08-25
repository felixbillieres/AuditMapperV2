import {
  AutoReconHost,
  AutoReconReport,
  ParsedAutoReconData,
  ScanResult,
  Port,
  Service,
  Command,
  FileNode,
  ServiceFile,
  OSFingerprint,
  Vulnerability
} from '../types/autorecon';

export class AutoReconParser {
  private rawFiles: Map<string, string> = new Map();

  async parseAutoReconResults(files: FileList): Promise<ParsedAutoReconData> {
    this.rawFiles.clear();
    
    console.log('Starting parse with', files.length, 'files');
    
    try {
      // Parse files one by one to avoid memory issues
      const hosts = await this.parseFilesStreamlined(files);
      
      console.log('Extracted hosts:', hosts.length);
      
      // Build file structure (lightweight)
      const fileStructure = this.buildLightweightFileStructure(files);
      
      // Build the report
      const report: AutoReconReport = {
        hosts,
        timestamp: new Date().toISOString(),
        totalHosts: hosts.length,
        metadata: {
          totalCommands: hosts.reduce((sum, host) => sum + host.commands.length, 0),
          totalServices: hosts.reduce((sum, host) => sum + host.services.length, 0),
        }
      };

      // Only store small essential files in rawFiles
      const essentialFiles = new Map<string, string>();
      for (const [path, content] of this.rawFiles.entries()) {
        if (content.length < 10000) { // Only store files < 10KB
          essentialFiles.set(path, content);
        }
      }

      return {
        report,
        rawFiles: essentialFiles,
        fileStructure
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('quota')) {
        throw new Error('Fichiers trop volumineux pour le stockage du navigateur. Essayez avec moins de fichiers ou des fichiers plus petits.');
      }
      throw error;
    }
  }

  private async parseFilesStreamlined(files: FileList): Promise<AutoReconHost[]> {
    const hosts: Map<string, AutoReconHost> = new Map();
    
    // First pass: identify target hosts from directory structure
    const targetHosts = this.identifyTargetHosts(files);
    console.log('Target hosts identified:', targetHosts);
    
    // Initialize target hosts
    for (const ip of targetHosts) {
      hosts.set(ip, {
        ip,
        ports: [],
        services: [],
        vulnerabilities: [],
        commands: [],
        scans: [],
        screenshots: [],
        notes: ''
      });
    }
    
    // Process files in batches to avoid memory issues
    const fileArray = Array.from(files);
    const batchSize = 10;
    
    for (let i = 0; i < fileArray.length; i += batchSize) {
      const batch = fileArray.slice(i, i + batchSize);
      
      for (const file of batch) {
        try {
          const content = await this.readFileContent(file);
          const filePath = file.webkitRelativePath || file.name;
          
          // Store content only if needed for analysis
          if (filePath.includes('nmap') || filePath.includes('nikto') || content.length < 5000) {
            this.rawFiles.set(filePath, content);
          }
          
          // Only process files for target hosts
          const hostIP = this.extractTargetHostFromPath(filePath, targetHosts);
          if (hostIP && hosts.has(hostIP)) {
            const host = hosts.get(hostIP)!;
            await this.parseFileForHostStreamlined(filePath, content, host);
          }
        } catch (error) {
          console.warn(`Erreur lors du parsing du fichier ${file.name}:`, error);
        }
      }
      
      // Force garbage collection between batches
      if (typeof window !== 'undefined' && (window as any).gc) {
        (window as any).gc();
      }
    }
    
    // Consolidate services for all hosts
    for (const host of hosts.values()) {
      this.consolidateServicesFromPorts(host);
    }
    
    // Filter out hosts with no meaningful data
    const validHosts = Array.from(hosts.values()).filter(host => 
      host.ports.length > 0 || host.services.length > 0 || host.scans.length > 0
    );
    
    console.log('Valid hosts after filtering:', validHosts.length);
    return validHosts;
  }

  private identifyTargetHosts(files: FileList): string[] {
    const targetHosts = new Set<string>();
    
    // Look for IP addresses in directory paths (these are usually target hosts)
    for (const file of Array.from(files)) {
      const path = file.webkitRelativePath || file.name;
      const pathParts = path.split('/');
      
      for (const part of pathParts) {
        if (this.isIPAddress(part)) {
          targetHosts.add(part);
        }
      }
    }
    
    return Array.from(targetHosts);
  }

  private extractTargetHostFromPath(filePath: string, targetHosts: string[]): string | null {
    for (const targetHost of targetHosts) {
      if (filePath.includes(targetHost)) {
        return targetHost;
      }
    }
    return null;
  }

  private buildLightweightFileStructure(files: FileList): FileNode[] {
    const rootNodes: Map<string, FileNode> = new Map();
    
    Array.from(files).forEach(file => {
      const pathParts = (file.webkitRelativePath || file.name).split('/');
      const fileName = pathParts[pathParts.length - 1];
      
      // Only build structure for important files
      if (this.isImportantFile(fileName)) {
        let currentLevel = rootNodes;
        let currentPath = '';
        
        pathParts.forEach((part, index) => {
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          
          if (!currentLevel.has(part)) {
            const node: FileNode = {
              name: part,
              path: currentPath,
              type: index === pathParts.length - 1 ? 'file' : 'directory',
              children: index === pathParts.length - 1 ? undefined : new Map(),
              size: index === pathParts.length - 1 ? file.size : undefined,
              extension: index === pathParts.length - 1 ? this.getFileExtension(part) : undefined
            };
            currentLevel.set(part, node);
          }
          
          if (index < pathParts.length - 1) {
            currentLevel = (currentLevel.get(part)!.children as Map<string, FileNode>);
          }
        });
      }
    });

    return this.convertMapToArray(rootNodes);
  }

  private isImportantFile(fileName: string): boolean {
    const importantPatterns = [
      'nmap', 'nikto', 'feroxbuster', 'dirbuster', 'gobuster',
      'whatweb', 'enum4linux', 'snmpwalk', 'onesixtyone',
      '.txt', '.log', '.xml'
    ];
    
    return importantPatterns.some(pattern => fileName.toLowerCase().includes(pattern));
  }

  private async parseFileForHostStreamlined(filePath: string, content: string, host: AutoReconHost): Promise<void> {
    const fileName = filePath.split('/').pop() || '';
    
    // Create full scan result (no truncation for new interface)
    const scanResult: ScanResult = {
      tool: this.extractToolFromFilename(fileName),
      command: this.extractCommandFromContent(content),
      output: content, // Keep full output
      outputFile: fileName,
      timestamp: this.extractTimestampFromContent(content)
    };
    
    host.scans.push(scanResult);
    
    // Parse specific content based on tool
    if (fileName.includes('nmap')) {
      const ports = this.extractPortsFromNmap(content);
      host.ports.push(...ports);
      
      const command = this.extractCommandFromNmap(content);
      if (command) {
        host.commands.push({
          command: command, // Keep full command
          tool: 'nmap',
          timestamp: this.extractTimestampFromNmap(content)
        });
      }
    } else if (fileName.includes('nikto')) {
      const vulns = this.parseNiktoVulnerabilities(content, 'http', 80);
      host.vulnerabilities.push(...vulns); // Keep all vulnerabilities
    }
  }

  private async readAllFiles(files: FileList): Promise<void> {
    const promises = Array.from(files).map(async (file) => {
      const content = await this.readFileContent(file);
      this.rawFiles.set(file.webkitRelativePath || file.name, content);
    });
    
    await Promise.all(promises);
  }

  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || '');
      reader.readAsText(file);
    });
  }

  private buildFileStructure(files: FileList): FileNode[] {
    const rootNodes: Map<string, FileNode> = new Map();
    
    Array.from(files).forEach(file => {
      const pathParts = (file.webkitRelativePath || file.name).split('/');
      let currentLevel = rootNodes;
      let currentPath = '';
      
      pathParts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (!currentLevel.has(part)) {
          const node: FileNode = {
            name: part,
            path: currentPath,
            type: index === pathParts.length - 1 ? 'file' : 'directory',
            children: index === pathParts.length - 1 ? undefined : new Map(),
            size: index === pathParts.length - 1 ? file.size : undefined,
            extension: index === pathParts.length - 1 ? this.getFileExtension(part) : undefined
          };
          currentLevel.set(part, node);
        }
        
        if (index < pathParts.length - 1) {
          currentLevel = (currentLevel.get(part)!.children as Map<string, FileNode>);
        }
      });
    });

    return this.convertMapToArray(rootNodes);
  }

  private convertMapToArray(nodeMap: Map<string, FileNode>): FileNode[] {
    return Array.from(nodeMap.values()).map(node => ({
      ...node,
      children: node.children ? this.convertMapToArray(node.children as Map<string, FileNode>) : undefined
    }));
  }

  private getFileExtension(filename: string): string | undefined {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : undefined;
  }

  private async extractHosts(fileStructure: FileNode[]): Promise<AutoReconHost[]> {
    const hosts: AutoReconHost[] = [];
    
    // Find host directories (IP addresses)
    const hostDirs = fileStructure.filter(node => 
      node.type === 'directory' && this.isIPAddress(node.name)
    );

    for (const hostDir of hostDirs) {
      const host = await this.parseHostDirectory(hostDir);
      if (host) {
        hosts.push(host);
      }
    }

    return hosts;
  }

  private async extractHostsFromFiles(): Promise<AutoReconHost[]> {
    const hosts: Map<string, AutoReconHost> = new Map();
    
    // Analyze each file individually to extract host information
    for (const [filePath, content] of this.rawFiles.entries()) {
      console.log('Analyzing file:', filePath);
      
      // Extract IP addresses from file path or content
      const ipsFromPath = this.extractIPFromPath(filePath);
      const ipsFromContent = this.extractIPsFromContent(content);
      
      const allIps = [...new Set([...ipsFromPath, ...ipsFromContent])];
      
      for (const ip of allIps) {
        if (!hosts.has(ip)) {
          hosts.set(ip, {
            ip,
            ports: [],
            services: [],
            vulnerabilities: [],
            commands: [],
            scans: [],
            screenshots: [],
            notes: ''
          });
        }
        
        // Parse file content for this host
        const host = hosts.get(ip)!;
        await this.parseFileForHost(filePath, content, host);
      }
    }
    
    return Array.from(hosts.values());
  }

  private extractIPFromPath(filePath: string): string[] {
    const ipRegex = /\b(\d{1,3}\.){3}\d{1,3}\b/g;
    const matches = filePath.match(ipRegex);
    return matches ? [...new Set(matches)] : [];
  }

  private extractIPsFromContent(content: string): string[] {
    const ipRegex = /\b(\d{1,3}\.){3}\d{1,3}\b/g;
    const matches = content.match(ipRegex);
    return matches ? [...new Set(matches.filter(ip => this.isValidIP(ip)))] : [];
  }

  private isValidIP(ip: string): boolean {
    const parts = ip.split('.');
    return parts.length === 4 && parts.every(part => {
      const num = parseInt(part);
      return num >= 0 && num <= 255;
    });
  }

  private async parseFileForHost(filePath: string, content: string, host: AutoReconHost): Promise<void> {
    // Determine what type of file this is and parse accordingly
    const fileName = filePath.split('/').pop() || '';
    
    // Create scan result
    const scanResult: ScanResult = {
      tool: this.extractToolFromFilename(fileName),
      command: this.extractCommandFromContent(content),
      output: content,
      outputFile: fileName,
      timestamp: this.extractTimestampFromContent(content)
    };
    
    host.scans.push(scanResult);
    
    // Parse specific content based on tool
    if (fileName.includes('nmap')) {
      const ports = this.extractPortsFromNmap(content);
      host.ports.push(...ports);
      
      // Extract commands from nmap output
      const command = this.extractCommandFromNmap(content);
      if (command) {
        host.commands.push({
          command,
          tool: 'nmap',
          timestamp: this.extractTimestampFromNmap(content)
        });
      }
    } else if (fileName.includes('nikto')) {
      const vulns = this.parseNiktoVulnerabilities(content, 'http', 80);
      host.vulnerabilities.push(...vulns);
    } else if (fileName.includes('feroxbuster') || fileName.includes('dirbuster')) {
      // Parse directory enumeration results
      scanResult.service = 'http';
    }
    
    // Extract general vulnerabilities
    const generalVulns = this.extractVulnerabilitiesFromContent(content, '', 0);
    host.vulnerabilities.push(...generalVulns);
    
    // After parsing all files, consolidate services from ports
    this.consolidateServicesFromPorts(host);
  }

  private consolidateServicesFromPorts(host: AutoReconHost): void {
    // Create services from detected ports
    const serviceMap = new Map<string, Service>();
    
    for (const port of host.ports) {
      if (port.state === 'open') {
        const serviceKey = `${port.service}-${port.port}-${port.protocol}`;
        
        if (!serviceMap.has(serviceKey)) {
          const service: Service = {
            name: port.service,
            port: port.port,
            protocol: port.protocol,
            version: port.version,
            banner: port.banner,
            scans: [],
            vulnerabilities: [],
            files: []
          };
          serviceMap.set(serviceKey, service);
        }
      }
    }
    
    // Add scans to appropriate services
    for (const scan of host.scans) {
      const service = Array.from(serviceMap.values()).find(s => 
        scan.outputFile?.includes(`${s.port}`) || 
        scan.outputFile?.includes(s.name) ||
        scan.service === s.name
      );
      
      if (service) {
        service.scans.push(scan);
      }
    }
    
    // Add consolidated services to host
    host.services.push(...Array.from(serviceMap.values()));
  }

  private extractTimestampFromContent(content: string): string {
    // Try various timestamp patterns
    const patterns = [
      /initiated (.+?) as:/i,
      /started (.+?) at/i,
      /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/,
      /(\w{3} \w{3} \d{1,2} \d{2}:\d{2}:\d{2} \d{4})/
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) return match[1];
    }
    
    return '';
  }

  private isIPAddress(str: string): boolean {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    return ipRegex.test(str);
  }

  private async parseHostDirectory(hostDir: FileNode): Promise<AutoReconHost | null> {
    const ip = hostDir.name;
    const host: AutoReconHost = {
      ip,
      ports: [],
      services: [],
      vulnerabilities: [],
      commands: [],
      scans: [],
      screenshots: [],
      notes: ''
    };

    if (!hostDir.children) return host;

    // Parse scans directory
    const scansDir = hostDir.children.find(child => child.name === 'scans');
    if (scansDir) {
      await this.parseScansDirectory(scansDir, host);
    }

    // Parse report directory  
    const reportDir = hostDir.children.find(child => child.name === 'report');
    if (reportDir) {
      await this.parseReportDirectory(reportDir, host);
    }

    // Parse screenshots
    const screenshotsDir = hostDir.children.find(child => child.name === 'screenshots');
    if (screenshotsDir && screenshotsDir.children) {
      host.screenshots = screenshotsDir.children
        .filter(child => child.type === 'file')
        .map(child => ({
          filename: child.name,
          path: child.path,
          timestamp: undefined
        }));
    }

    return host;
  }

  private async parseScansDirectory(scansDir: FileNode, host: AutoReconHost): Promise<void> {
    if (!scansDir.children) return;

    // Parse nmap files
    const nmapFiles = scansDir.children.filter(child => 
      child.type === 'file' && child.name.includes('nmap')
    );

    for (const nmapFile of nmapFiles) {
      const content = this.rawFiles.get(nmapFile.path);
      if (content) {
        const scanResult = this.parseNmapOutput(content, nmapFile.name);
        host.scans.push(scanResult);
        
        // Extract ports from nmap
        const ports = this.extractPortsFromNmap(content);
        host.ports.push(...ports);
      }
    }

    // Parse commands log
    const commandsFile = scansDir.children.find(child => child.name === '_commands.log');
    if (commandsFile) {
      const content = this.rawFiles.get(commandsFile.path);
      if (content) {
        host.commands = this.parseCommandsLog(content);
      }
    }

    // Parse service-specific directories
    const serviceDirs = scansDir.children.filter(child => 
      child.type === 'directory' && (child.name.startsWith('tcp') || child.name.startsWith('udp'))
    );

    for (const serviceDir of serviceDirs) {
      const service = await this.parseServiceDirectory(serviceDir, host.ip);
      if (service) {
        host.services.push(service);
      }
    }
  }

  private parseNmapOutput(content: string, filename: string): ScanResult {
    return {
      tool: 'nmap',
      command: this.extractCommandFromNmap(content),
      output: content,
      outputFile: filename,
      timestamp: this.extractTimestampFromNmap(content)
    };
  }

  private extractCommandFromNmap(content: string): string {
    const lines = content.split('\n');
    const commandLine = lines.find(line => line.includes('nmap') && line.includes(' as: '));
    if (commandLine) {
      const match = commandLine.match(/as: (.+)/);
      return match ? match[1] : '';
    }
    return '';
  }

  private extractTimestampFromNmap(content: string): string {
    const lines = content.split('\n');
    const timestampLine = lines.find(line => line.includes('initiated'));
    if (timestampLine) {
      const match = timestampLine.match(/initiated (.+) as:/);
      return match ? match[1] : '';
    }
    return '';
  }

  private extractPortsFromNmap(content: string): Port[] {
    const ports: Port[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const portMatch = line.match(/^(\d+)\/(tcp|udp)\s+(open|closed|filtered)\s+(\S+)(.*)$/);
      if (portMatch) {
        const port: Port = {
          port: parseInt(portMatch[1]),
          protocol: portMatch[2] as 'tcp' | 'udp',
          state: portMatch[3] as 'open' | 'closed' | 'filtered',
          service: portMatch[4],
          version: portMatch[5] ? portMatch[5].trim() : undefined
        };
        ports.push(port);
      }
    }

    return ports;
  }

  private parseCommandsLog(content: string): Command[] {
    const commands: Command[] = [];
    const lines = content.split('\n').filter(line => line.trim());

    for (const line of lines) {
      if (line.trim()) {
        commands.push({
          command: line.trim(),
          tool: this.extractToolFromCommand(line)
        });
      }
    }

    return commands;
  }

  private extractToolFromCommand(command: string): string {
    const firstWord = command.split(' ')[0];
    return firstWord.split('/').pop() || firstWord;
  }

  private async parseServiceDirectory(serviceDir: FileNode, hostIp: string): Promise<Service | null> {
    const match = serviceDir.name.match(/^(tcp|udp)(\d+)$/);
    if (!match) return null;

    const protocol = match[1] as 'tcp' | 'udp';
    const port = parseInt(match[2]);

    if (!serviceDir.children) return null;

    const service: Service = {
      name: '',
      port,
      protocol,
      scans: [],
      vulnerabilities: [],
      files: []
    };

    // Parse all files in the service directory
    for (const child of serviceDir.children) {
      if (child.type === 'file') {
        const content = this.rawFiles.get(child.path);
        if (content) {
          // Determine service name from filename or content
          if (!service.name) {
            service.name = this.extractServiceNameFromFilename(child.name) || 
                           this.extractServiceNameFromContent(content);
          }

          // Create scan result
          const scanResult: ScanResult = {
            tool: this.extractToolFromFilename(child.name),
            command: this.extractCommandFromContent(content),
            output: content,
            outputFile: child.name,
            service: service.name,
            port
          };
          service.scans.push(scanResult);

          // Create service file
          const serviceFile: ServiceFile = {
            filename: child.name,
            path: child.path,
            type: this.determineFileType(child.name),
            content,
            size: child.size
          };
          service.files.push(serviceFile);

          // Extract vulnerabilities
          const vulns = this.extractVulnerabilitiesFromContent(content, service.name, port);
          service.vulnerabilities.push(...vulns);
        }
      }
    }

    return service;
  }

  private extractServiceNameFromFilename(filename: string): string {
    const patterns = [
      /tcp_\d+_([^_]+)_/,
      /udp_\d+_([^_]+)_/,
      /_([^_]+)_nmap/,
      /_([^_]+)\./
    ];

    for (const pattern of patterns) {
      const match = filename.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return '';
  }

  private extractServiceNameFromContent(content: string): string {
    const serviceMatch = content.match(/(\d+)\/(tcp|udp)\s+open\s+([^\s]+)/);
    return serviceMatch ? serviceMatch[3] : '';
  }

  private extractToolFromFilename(filename: string): string {
    if (filename.includes('nmap')) return 'nmap';
    if (filename.includes('nikto')) return 'nikto';
    if (filename.includes('feroxbuster') || filename.includes('dirbuster')) return 'feroxbuster';
    if (filename.includes('curl')) return 'curl';
    if (filename.includes('gobuster')) return 'gobuster';
    if (filename.includes('ffuf')) return 'ffuf';
    if (filename.includes('whatweb')) return 'whatweb';
    if (filename.includes('enum4linux')) return 'enum4linux';
    if (filename.includes('smbclient')) return 'smbclient';
    if (filename.includes('snmpwalk')) return 'snmpwalk';
    if (filename.includes('onesixtyone')) return 'onesixtyone';
    
    return 'unknown';
  }

  private extractCommandFromContent(content: string): string {
    const lines = content.split('\n');
    
    // Look for command in nmap output
    const nmapCommandLine = lines.find(line => line.includes(' as: '));
    if (nmapCommandLine) {
      const match = nmapCommandLine.match(/as: (.+)/);
      return match ? match[1] : '';
    }

    // Look for command in other tool outputs
    const commandLine = lines.find(line => 
      line.includes('$') || line.includes('#') || line.startsWith('> ')
    );
    
    return commandLine ? commandLine.replace(/^[#$>]\s*/, '').trim() : '';
  }

  private determineFileType(filename: string): 'scan' | 'output' | 'report' | 'xml' {
    if (filename.endsWith('.xml')) return 'xml';
    if (filename.includes('report')) return 'report';
    if (filename.includes('nmap') || filename.includes('scan')) return 'scan';
    return 'output';
  }

  private extractVulnerabilitiesFromContent(content: string, service: string, port: number): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];
    
    // Parse Nikto vulnerabilities
    if (content.includes('Nikto')) {
      const niktoVulns = this.parseNiktoVulnerabilities(content, service, port);
      vulnerabilities.push(...niktoVulns);
    }

    // Parse Nmap script vulnerabilities
    if (content.includes('VULNERABLE') || content.includes('CVE-')) {
      const nmapVulns = this.parseNmapVulnerabilities(content, service, port);
      vulnerabilities.push(...nmapVulns);
    }

    return vulnerabilities;
  }

  private parseNiktoVulnerabilities(content: string, service: string, port: number): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.startsWith('+ ') && line.includes(':')) {
        const vuln: Vulnerability = {
          id: `nikto-${Date.now()}-${Math.random()}`,
          title: line.substring(2).trim(),
          description: line.substring(2).trim(),
          severity: this.determineSeverityFromNikto(line),
          service,
          port
        };
        vulnerabilities.push(vuln);
      }
    }

    return vulnerabilities;
  }

  private parseNmapVulnerabilities(content: string, service: string, port: number): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes('VULNERABLE') || line.includes('CVE-')) {
        const cveMatch = line.match(/CVE-\d{4}-\d+/);
        const vuln: Vulnerability = {
          id: cveMatch ? cveMatch[0] : `nmap-${Date.now()}-${Math.random()}`,
          title: line.trim(),
          description: line.trim(),
          severity: 'medium',
          service,
          port,
          cve: cveMatch ? cveMatch[0] : undefined
        };
        vulnerabilities.push(vuln);
      }
    }

    return vulnerabilities;
  }

  private determineSeverityFromNikto(line: string): 'low' | 'medium' | 'high' | 'critical' {
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.includes('critical') || lowerLine.includes('dangerous')) return 'critical';
    if (lowerLine.includes('high') || lowerLine.includes('exploit')) return 'high';
    if (lowerLine.includes('medium') || lowerLine.includes('warning')) return 'medium';
    
    return 'low';
  }

  private async parseReportDirectory(reportDir: FileNode, host: AutoReconHost): Promise<void> {
    if (!reportDir.children) return;

    // Parse notes.txt
    const notesFile = reportDir.children.find(child => child.name === 'notes.txt');
    if (notesFile) {
      const content = this.rawFiles.get(notesFile.path);
      if (content) {
        host.notes = content;
      }
    }

    // Parse other report files for additional information
    const reportFiles = reportDir.children.filter(child => 
      child.type === 'file' && (child.name.endsWith('.txt') || child.name.endsWith('.md'))
    );

    for (const reportFile of reportFiles) {
      const content = this.rawFiles.get(reportFile.path);
      if (content && reportFile.name !== 'notes.txt') {
        // Add as additional scan results
        const scanResult: ScanResult = {
          tool: 'autorecon',
          command: '',
          output: content,
          outputFile: reportFile.name
        };
        host.scans.push(scanResult);
      }
    }
  }
}
