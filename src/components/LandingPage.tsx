import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  Server, 
  Shield, 
  Search, 
  Network, 
  FileText, 
  Zap,
  Github,
  ExternalLink,
  Moon,
  Sun,
  Globe,
  Flag,
  Trophy,
  Code,
  Target,
  Users,
  BarChart3,
  Infinity,
  Clock,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const LandingPage: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentLang, setCurrentLang] = useState('fr');
  const navigate = useNavigate();

  // Animation variants
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const scaleOnHover = {
    whileHover: { scale: 1.05 },
    whileTap: { scale: 0.95 }
  };

  const tools = [
    {
      title: "Host Manager",
      description: "Gestionnaire centralisé pour tous vos hosts avec interface graphique interactive",
      icon: Server,
      features: ["Visualisation réseau", "Catégorisation", "Export multi-format", "Rapports automatiques"],
      color: "from-blue-500 to-cyan-500",
      route: "/host-manager"
    },
    {
      title: "Config Generator", 
      description: "Générateur automatique de fichiers de configuration pour vos pentests",
      icon: Network,
      features: ["Fichiers /etc/hosts", "Config Kerberos", "ProxyChains", "Templates custom"],
      color: "from-green-500 to-emerald-500",
      route: "/config-generator"
    },
    {
      title: "Calendar",
      description: "Kanban + Timer global pour planifier vos tâches de pentest",
      icon: Clock,
      features: ["Kanban drag & drop", "Timer global", "Presets rapides", "LocalStorage"],
      color: "from-cyan-500 to-blue-500",
      route: "/calendar"
    },
    {
      title: "Grep Master",
      description: "Parser intelligent pour extraire les informations utiles de vos outputs",
      icon: Search,
      features: ["Extraction auto", "Multi-format", "Filtrage avancé", "Export structuré"],
      color: "from-purple-500 to-pink-500",
      route: "/grep-master"
    },
    {
      title: "Pivot Master",
      description: "Générateur de commandes de pivoting avec visualisation réseau",
      icon: Zap,
      features: ["Visualisation réseau", "Commandes auto", "Multi-protocoles", "Historique"],
      color: "from-orange-500 to-red-500",
      route: "/pivot-master"
    },
    {
      title: "Privesc Helper",
      description: "Guide interactif pour l'escalade de privilèges avec suivi de progression",
      icon: Shield,
      features: ["Checklist interactive", "Suivi progression", "Techniques détaillées", "Export rapport"],
      color: "from-indigo-500 to-purple-500",
      route: "/privesc-helper"
    },
    {
      title: "File Transfer",
      description: "Générateur de commandes de transfert de fichiers pour tous les contextes",
      icon: FileText,
      features: ["Multi-protocoles", "One-liners", "Encodage auto", "Serveurs locaux"],
      color: "from-teal-500 to-blue-500",
      route: "/file-transfer"
    }
  ];

  const stats = [
    { value: "15+", label: "Outils Intégrés", icon: Star },
    { value: "100%", label: "Open Source", icon: Github },
    { value: "24/7", label: "Disponibilité", icon: Clock },
    { value: "∞", label: "Possibilités", icon: Infinity }
  ];

  const interests = [
    { icon: "🏠", text: "Hackthebox Machines" },
    { icon: "🔍", text: "Code Review" },
    { icon: "🏆", text: "CTF Challenges" },
    { icon: "🛠️", text: "Développement d'Outils" },
    { icon: "🌐", text: "Active Directory" },
    { icon: "🕷️", text: "Pentest Web" }
  ];

  const quickStartSteps = [
    {
      number: 1,
      title: "Accédez au Host Manager",
      description: "Commencez par ajouter vos hosts cibles dans le gestionnaire centralisé"
    },
    {
      number: 2,
      title: "Organisez vos données",
      description: "Catégorisez vos hosts, ajoutez des notes et des informations de reconnaissance"
    },
    {
      number: 3,
      title: "Utilisez les outils",
      description: "Exploitez les différents parsers et générateurs pour optimiser votre workflow"
    },
    {
      number: 4,
      title: "Générez vos rapports",
      description: "Exportez vos données sous différents formats pour vos rapports finaux"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-x-hidden overflow-y-auto">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-cyan-900/20"></div>
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      {/* Header/Navigation */}
      <motion.header 
        className="relative z-10 p-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-4"
            whileHover={{ scale: 1.05 }}
          >
            <img src="/logo.png" alt="AuditMapper" className="w-12 h-12 rounded-lg" />
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                AuditMapper
              </h1>
              <p className="text-sm text-slate-400">Security Assessment Suite</p>
            </div>
          </motion.div>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentLang(currentLang === 'fr' ? 'en' : 'fr')}
              className="bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Flag className="w-4 h-4 mr-2" />
              {currentLang === 'fr' ? '🇫🇷 FR' : '🇬🇧 EN'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <motion.section 
        className="relative z-10 py-20 px-6"
        initial="initial"
        animate="animate"
        variants={staggerContainer}
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.div 
            className="relative mb-8"
            variants={fadeInUp}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl"></div>
            <img src="/logo.png" alt="AuditMapper" className="relative w-32 h-32 mx-auto rounded-2xl shadow-2xl" />
          </motion.div>

          <motion.h1 
            className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent"
            variants={fadeInUp}
          >
            AuditMapper
          </motion.h1>

          <motion.p 
            className="text-xl md:text-2xl text-slate-300 mb-4"
            variants={fadeInUp}
          >
            Security Assessment Suite
          </motion.p>

          <motion.p 
            className="text-lg text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed"
            variants={fadeInUp}
          >
            Suite d'outils professionnels pour audits de sécurité et tests d'intrusion. 
            Gérez vos hosts, générez des rapports et optimisez vos pentests avec une interface moderne et intuitive.
          </motion.p>

          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            variants={fadeInUp}
          >
            <motion.div {...scaleOnHover}>
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0 px-8 py-4 text-lg font-semibold"
                onClick={() => navigate('/host-manager')}
              >
                🚀 Commencer maintenant
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </motion.div>
            <motion.div {...scaleOnHover}>
              <Button 
                variant="outline" 
                size="lg"
                className="bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700 px-8 py-4 text-lg"
                onClick={() => {
                  window.scrollTo({ top: document.body.scrollHeight / 3, behavior: 'smooth' });
                }}
              >
                📖 Découvrir les outils
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Tools Grid */}
      <motion.section 
        className="relative z-10 py-20 px-6"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
        <div className="max-w-7xl mx-auto">
          <motion.div className="text-center mb-16" variants={fadeInUp}>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Outils Disponibles
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Accédez rapidement à tous vos outils de pentest favoris dans une interface moderne
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tools.map((tool, index) => (
              <motion.div
                key={tool.title}
                variants={fadeInUp}
                whileHover={{ y: -10 }}
                className="group"
              >
                <Card className="h-full bg-slate-800/50 border-slate-700 backdrop-blur-sm hover:bg-slate-800/70 transition-all duration-300">
                  <CardHeader>
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <tool.icon className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-xl text-slate-100 group-hover:text-white transition-colors">
                      {tool.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-slate-400 leading-relaxed">
                      {tool.description}
                    </p>
                    <ul className="space-y-2">
                      {tool.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center text-sm text-slate-500">
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-3"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className="w-full mt-4 bg-slate-700 hover:bg-slate-600 text-slate-200 border-0"
                      variant="outline"
                      onClick={() => navigate(tool.route)}
                    >
                      Accéder à l'outil
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Stats Section */}
      <motion.section 
        className="relative z-10 py-16 px-6"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
        <div className="max-w-6xl mx-auto">
          <motion.h2 
            className="text-3xl md:text-4xl font-bold text-center mb-12 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
            variants={fadeInUp}
          >
            AuditMapper en Chiffres
          </motion.h2>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                className="text-center group"
                variants={fadeInUp}
                whileHover={{ scale: 1.05 }}
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-all duration-300">
                  <stat.icon className="w-8 h-8 text-blue-400" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                  {stat.value}
                </div>
                <div className="text-slate-400 font-medium">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Whoami Section */}
      <motion.section 
        className="relative z-10 py-20 px-6"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
        <div className="max-w-4xl mx-auto">
          <motion.h2 
            className="text-4xl md:text-5xl font-bold text-center mb-16 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
            variants={fadeInUp}
          >
            👤 Whoami
          </motion.h2>

          <motion.div variants={fadeInUp}>
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-lg opacity-50"></div>
                    <img 
                      src="https://felixbillieres.github.io/assets/images/pfp.png" 
                      alt="Elliot Belt" 
                      className="relative w-24 h-24 rounded-full object-cover"
                    />
                  </div>
                  <div className="text-center md:text-left">
                    <h3 className="text-2xl font-bold text-white mb-2">Elliot Belt</h3>
                    <p className="text-slate-400 mb-4">Pentester Junior & CTF player @ Phreaks 2600</p>
                    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                      <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm border border-blue-500/30">
                        🏆 CTF Player
                      </span>
                      <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm border border-purple-500/30">
                        🔍 (Very Junior) Pentester
                      </span>
                      <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm border border-cyan-500/30">
                        🛠️ Tooling
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h4 className="text-xl font-semibold text-white mb-4 flex items-center">
                    🎯 Domaines d'intérêt
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {interests.map((interest, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                        <span className="text-2xl">{interest.icon}</span>
                        <span className="text-slate-300">{interest.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    variant="outline" 
                    className="bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600"
                    asChild
                  >
                    <a href="https://felixbillieres.github.io/" target="_blank" rel="noopener noreferrer">
                      <Globe className="w-4 h-4 mr-2" />
                      Portfolio & Recherches
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600"
                    asChild
                  >
                    <a href="https://github.com/felixbillieres" target="_blank" rel="noopener noreferrer">
                      <Github className="w-4 h-4 mr-2" />
                      GitHub
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.section>

      {/* Quick Start Section */}
      <motion.section 
        className="relative z-10 py-20 px-6"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
        <div className="max-w-5xl mx-auto">
          <motion.div className="text-center mb-16" variants={fadeInUp}>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Démarrage Rapide
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Commencez à utiliser AuditMapper en quelques étapes simples
            </p>
          </motion.div>

          <div className="space-y-8">
            {quickStartSteps.map((step, index) => (
              <motion.div
                key={step.number}
                className="flex flex-col md:flex-row items-center gap-6 p-6 bg-slate-800/30 rounded-xl border border-slate-700"
                variants={fadeInUp}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-2xl font-bold text-white">
                  {step.number}
                </div>
                <div className="text-center md:text-left">
                  <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <motion.footer 
        className="relative z-10 py-12 px-6 border-t border-slate-700"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        variants={fadeInUp}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                AuditMapper
              </h3>
              <p className="text-slate-400 mb-2">Made with ❤️ by <strong>Elliot Belt</strong></p>
              <p className="text-slate-500">Suite d'outils pour audits de sécurité et tests d'intrusion</p>
            </div>
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                className="bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700"
                asChild
              >
                <a href="https://github.com/your-repo" target="_blank" rel="noopener noreferrer">
                  <Github className="w-4 h-4 mr-2" />
                  GitHub
                </a>
              </Button>
              <Button 
                variant="outline" 
                className="bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <FileText className="w-4 h-4 mr-2" />
                Documentation
              </Button>
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
};

export default LandingPage;
