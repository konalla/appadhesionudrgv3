import { Wrench, Clock, Users, Camera, FileDown, Building2, Phone } from "lucide-react";

export default function Maintenance() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-4">
      <div className="w-full max-w-4xl text-center text-white">
        {/* Logo */}
        <div className="mx-auto w-24 h-24 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center text-white text-4xl font-bold mb-8 border border-white/30">
          U
        </div>
        
        {/* Main Title */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <Wrench size={48} className="text-yellow-300" />
          <h1 className="text-5xl md:text-6xl font-bold">
            Maintenance
          </h1>
        </div>
        
        {/* Subtitle */}
        <h2 className="text-2xl md:text-3xl font-semibold mb-8 text-blue-100">
          Système en cours de maintenance
        </h2>
        
        {/* Main Message */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-white/20">
          <p className="text-xl mb-6 leading-relaxed">
            <strong>Le système de gestion des membres UDRG est temporairement indisponible.</strong>
          </p>
          <p className="text-lg mb-6 text-blue-100 leading-relaxed">
            Nous effectuons des améliorations importantes pour vous offrir une meilleure expérience 
            et résoudre les problèmes techniques actuels.
          </p>
          
          {/* Features Being Maintained */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="bg-white/10 rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3 mb-3">
                <Users className="text-yellow-300" size={24} />
                <h3 className="font-semibold text-lg">Inscription des membres</h3>
              </div>
              <p className="text-sm text-blue-100">Système d'enregistrement et validation</p>
            </div>
            
            <div className="bg-white/10 rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3 mb-3">
                <Camera className="text-yellow-300" size={24} />
                <h3 className="font-semibold text-lg">Gestion des photos</h3>
              </div>
              <p className="text-sm text-blue-100">Upload et affichage des photos</p>
            </div>
            
            <div className="bg-white/10 rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3 mb-3">
                <FileDown className="text-yellow-300" size={24} />
                <h3 className="font-semibold text-lg">Export des données</h3>
              </div>
              <p className="text-sm text-blue-100">Génération et téléchargement</p>
            </div>
            
            <div className="bg-white/10 rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3 mb-3">
                <Building2 className="text-yellow-300" size={24} />
                <h3 className="font-semibold text-lg">Administration</h3>
              </div>
              <p className="text-sm text-blue-100">Gestion fédérations et sections</p>
            </div>
          </div>
        </div>
        
        {/* Status Indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse delay-100"></div>
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse delay-200"></div>
        </div>
        
        {/* Status Message */}
        <div className="bg-yellow-400/20 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-yellow-400/30">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Clock className="text-yellow-300" size={28} />
            <h3 className="text-xl font-semibold">Statut des travaux</h3>
          </div>
          <p className="text-2xl font-bold text-yellow-300">Nous reviendrons bientôt</p>
          <p className="text-sm text-blue-100 mt-2">
            Les travaux ont commencé à {new Date().toLocaleTimeString('fr-FR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </p>
        </div>
        
        {/* Thank You Message */}
        <div className="text-lg text-blue-100 mb-8">
          <p className="font-medium">Merci de votre patience et de votre compréhension.</p>
          <p className="text-base mt-2">
            L'équipe technique travaille activement pour rétablir tous les services.
          </p>
        </div>
        
        {/* Contact Info */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Phone className="text-green-300" size={24} />
            <h3 className="text-lg font-semibold">Contact d'urgence</h3>
          </div>
          <p className="text-blue-100">
            Pour toute urgence administrative, contactez l'équipe support.
          </p>
        </div>
        
        {/* Footer */}
        <div className="mt-12 text-sm text-blue-200 opacity-75">
          <p>Union des Démocrates Pour La Renaissance de la Guinée</p>
          <p className="mt-1">Système de gestion des membres - Version en maintenance</p>
        </div>
      </div>
    </div>
  );
}