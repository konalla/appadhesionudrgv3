import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTranslation } from "react-i18next";

// Liste complète des indicatifs téléphoniques internationaux, organisée par région
// Format: { code: string, dial_code: string, name: string, flag: string }
export const countryCodes = [
  // Afrique de l'Ouest - priorité aux pays avec une importante diaspora guinéenne
  { code: "GN", dial_code: "+224", name: "Guinée", flag: "🇬🇳" },
  { code: "SN", dial_code: "+221", name: "Sénégal", flag: "🇸🇳" },
  { code: "ML", dial_code: "+223", name: "Mali", flag: "🇲🇱" },
  { code: "CI", dial_code: "+225", name: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: "SL", dial_code: "+232", name: "Sierra Leone", flag: "🇸🇱" },
  { code: "LR", dial_code: "+231", name: "Libéria", flag: "🇱🇷" },
  { code: "GM", dial_code: "+220", name: "Gambie", flag: "🇬🇲" },
  { code: "BF", dial_code: "+226", name: "Burkina Faso", flag: "🇧🇫" },
  { code: "TG", dial_code: "+228", name: "Togo", flag: "🇹🇬" },
  { code: "BJ", dial_code: "+229", name: "Bénin", flag: "🇧🇯" },
  { code: "GH", dial_code: "+233", name: "Ghana", flag: "🇬🇭" },
  { code: "NG", dial_code: "+234", name: "Nigéria", flag: "🇳🇬" },
  { code: "NE", dial_code: "+227", name: "Niger", flag: "🇳🇪" },
  { code: "CV", dial_code: "+238", name: "Cap-Vert", flag: "🇨🇻" },
  
  // Afrique Centrale
  { code: "CM", dial_code: "+237", name: "Cameroun", flag: "🇨🇲" },
  { code: "GA", dial_code: "+241", name: "Gabon", flag: "🇬🇦" },
  { code: "CD", dial_code: "+243", name: "RD Congo", flag: "🇨🇩" },
  { code: "CG", dial_code: "+242", name: "Congo", flag: "🇨🇬" },
  { code: "CF", dial_code: "+236", name: "Centrafrique", flag: "🇨🇫" },
  { code: "TD", dial_code: "+235", name: "Tchad", flag: "🇹🇩" },
  { code: "GQ", dial_code: "+240", name: "Guinée Équatoriale", flag: "🇬🇶" },
  
  // Afrique du Nord et Maghreb
  { code: "MA", dial_code: "+212", name: "Maroc", flag: "🇲🇦" },
  { code: "DZ", dial_code: "+213", name: "Algérie", flag: "🇩🇿" },
  { code: "TN", dial_code: "+216", name: "Tunisie", flag: "🇹🇳" },
  { code: "LY", dial_code: "+218", name: "Libye", flag: "🇱🇾" },
  { code: "EG", dial_code: "+20", name: "Égypte", flag: "🇪🇬" },
  { code: "SD", dial_code: "+249", name: "Soudan", flag: "🇸🇩" },
  { code: "MR", dial_code: "+222", name: "Mauritanie", flag: "🇲🇷" },
  
  // Afrique de l'Est
  { code: "ET", dial_code: "+251", name: "Éthiopie", flag: "🇪🇹" },
  { code: "KE", dial_code: "+254", name: "Kenya", flag: "🇰🇪" },
  { code: "TZ", dial_code: "+255", name: "Tanzanie", flag: "🇹🇿" },
  { code: "UG", dial_code: "+256", name: "Ouganda", flag: "🇺🇬" },
  { code: "RW", dial_code: "+250", name: "Rwanda", flag: "🇷🇼" },
  { code: "BI", dial_code: "+257", name: "Burundi", flag: "🇧🇮" },
  { code: "DJ", dial_code: "+253", name: "Djibouti", flag: "🇩🇯" },
  { code: "SO", dial_code: "+252", name: "Somalie", flag: "🇸🇴" },
  { code: "ER", dial_code: "+291", name: "Érythrée", flag: "🇪🇷" },
  
  // Afrique Australe
  { code: "ZA", dial_code: "+27", name: "Afrique du Sud", flag: "🇿🇦" },
  { code: "NA", dial_code: "+264", name: "Namibie", flag: "🇳🇦" },
  { code: "BW", dial_code: "+267", name: "Botswana", flag: "🇧🇼" },
  { code: "ZM", dial_code: "+260", name: "Zambie", flag: "🇿🇲" },
  { code: "ZW", dial_code: "+263", name: "Zimbabwe", flag: "🇿🇼" },
  { code: "MZ", dial_code: "+258", name: "Mozambique", flag: "🇲🇿" },
  { code: "MG", dial_code: "+261", name: "Madagascar", flag: "🇲🇬" },
  { code: "MU", dial_code: "+230", name: "Maurice", flag: "🇲🇺" },
  { code: "SC", dial_code: "+248", name: "Seychelles", flag: "🇸🇨" },
  
  // Europe de l'Ouest - diaspora guinéenne importante
  { code: "FR", dial_code: "+33", name: "France", flag: "🇫🇷" },
  { code: "BE", dial_code: "+32", name: "Belgique", flag: "🇧🇪" },
  { code: "CH", dial_code: "+41", name: "Suisse", flag: "🇨🇭" },
  { code: "DE", dial_code: "+49", name: "Allemagne", flag: "🇩🇪" },
  { code: "GB", dial_code: "+44", name: "Royaume-Uni", flag: "🇬🇧" },
  { code: "IT", dial_code: "+39", name: "Italie", flag: "🇮🇹" },
  { code: "ES", dial_code: "+34", name: "Espagne", flag: "🇪🇸" },
  { code: "PT", dial_code: "+351", name: "Portugal", flag: "🇵🇹" },
  { code: "NL", dial_code: "+31", name: "Pays-Bas", flag: "🇳🇱" },
  { code: "LU", dial_code: "+352", name: "Luxembourg", flag: "🇱🇺" },
  { code: "IE", dial_code: "+353", name: "Irlande", flag: "🇮🇪" },
  { code: "MC", dial_code: "+377", name: "Monaco", flag: "🇲🇨" },
  { code: "AD", dial_code: "+376", name: "Andorre", flag: "🇦🇩" },
  
  // Europe du Nord
  { code: "SE", dial_code: "+46", name: "Suède", flag: "🇸🇪" },
  { code: "NO", dial_code: "+47", name: "Norvège", flag: "🇳🇴" },
  { code: "DK", dial_code: "+45", name: "Danemark", flag: "🇩🇰" },
  { code: "FI", dial_code: "+358", name: "Finlande", flag: "🇫🇮" },
  { code: "IS", dial_code: "+354", name: "Islande", flag: "🇮🇸" },
  { code: "EE", dial_code: "+372", name: "Estonie", flag: "🇪🇪" },
  { code: "LV", dial_code: "+371", name: "Lettonie", flag: "🇱🇻" },
  { code: "LT", dial_code: "+370", name: "Lituanie", flag: "🇱🇹" },
  
  // Europe de l'Est
  { code: "PL", dial_code: "+48", name: "Pologne", flag: "🇵🇱" },
  { code: "CZ", dial_code: "+420", name: "République tchèque", flag: "🇨🇿" },
  { code: "SK", dial_code: "+421", name: "Slovaquie", flag: "🇸🇰" },
  { code: "HU", dial_code: "+36", name: "Hongrie", flag: "🇭🇺" },
  { code: "RO", dial_code: "+40", name: "Roumanie", flag: "🇷🇴" },
  { code: "BG", dial_code: "+359", name: "Bulgarie", flag: "🇧🇬" },
  { code: "RU", dial_code: "+7", name: "Russie", flag: "🇷🇺" },
  { code: "UA", dial_code: "+380", name: "Ukraine", flag: "🇺🇦" },
  { code: "BY", dial_code: "+375", name: "Biélorussie", flag: "🇧🇾" },
  { code: "MD", dial_code: "+373", name: "Moldavie", flag: "🇲🇩" },
  
  // Europe du Sud
  { code: "GR", dial_code: "+30", name: "Grèce", flag: "🇬🇷" },
  { code: "TR", dial_code: "+90", name: "Turquie", flag: "🇹🇷" },
  { code: "HR", dial_code: "+385", name: "Croatie", flag: "🇭🇷" },
  { code: "SI", dial_code: "+386", name: "Slovénie", flag: "🇸🇮" },
  { code: "AL", dial_code: "+355", name: "Albanie", flag: "🇦🇱" },
  { code: "RS", dial_code: "+381", name: "Serbie", flag: "🇷🇸" },
  { code: "ME", dial_code: "+382", name: "Monténégro", flag: "🇲🇪" },
  { code: "MK", dial_code: "+389", name: "Macédoine du Nord", flag: "🇲🇰" },
  { code: "BA", dial_code: "+387", name: "Bosnie-Herzégovine", flag: "🇧🇦" },
  { code: "MT", dial_code: "+356", name: "Malte", flag: "🇲🇹" },
  { code: "CY", dial_code: "+357", name: "Chypre", flag: "🇨🇾" },
  
  // Amérique du Nord et Caraïbes
  { code: "US", dial_code: "+1", name: "États-Unis", flag: "🇺🇸" },
  { code: "CA", dial_code: "+1", name: "Canada", flag: "🇨🇦" },
  { code: "MX", dial_code: "+52", name: "Mexique", flag: "🇲🇽" },
  { code: "PR", dial_code: "+1", name: "Porto Rico", flag: "🇵🇷" },
  { code: "JM", dial_code: "+1", name: "Jamaïque", flag: "🇯🇲" },
  { code: "DO", dial_code: "+1", name: "Rép. Dominicaine", flag: "🇩🇴" },
  { code: "HT", dial_code: "+509", name: "Haïti", flag: "🇭🇹" },
  { code: "CU", dial_code: "+53", name: "Cuba", flag: "🇨🇺" },
  { code: "BS", dial_code: "+1", name: "Bahamas", flag: "🇧🇸" },
  { code: "BB", dial_code: "+1", name: "Barbade", flag: "🇧🇧" },
  { code: "TT", dial_code: "+1", name: "Trinité-et-Tobago", flag: "🇹🇹" },
  
  // Amérique Centrale et du Sud
  { code: "BR", dial_code: "+55", name: "Brésil", flag: "🇧🇷" },
  { code: "AR", dial_code: "+54", name: "Argentine", flag: "🇦🇷" },
  { code: "CO", dial_code: "+57", name: "Colombie", flag: "🇨🇴" },
  { code: "PE", dial_code: "+51", name: "Pérou", flag: "🇵🇪" },
  { code: "VE", dial_code: "+58", name: "Venezuela", flag: "🇻🇪" },
  { code: "CL", dial_code: "+56", name: "Chili", flag: "🇨🇱" },
  { code: "EC", dial_code: "+593", name: "Équateur", flag: "🇪🇨" },
  { code: "GT", dial_code: "+502", name: "Guatemala", flag: "🇬🇹" },
  { code: "CR", dial_code: "+506", name: "Costa Rica", flag: "🇨🇷" },
  { code: "PA", dial_code: "+507", name: "Panama", flag: "🇵🇦" },
  { code: "UY", dial_code: "+598", name: "Uruguay", flag: "🇺🇾" },
  { code: "PY", dial_code: "+595", name: "Paraguay", flag: "🇵🇾" },
  { code: "BO", dial_code: "+591", name: "Bolivie", flag: "🇧🇴" },
  
  // Moyen-Orient
  { code: "AE", dial_code: "+971", name: "Émirats Arabes Unis", flag: "🇦🇪" },
  { code: "SA", dial_code: "+966", name: "Arabie Saoudite", flag: "🇸🇦" },
  { code: "QA", dial_code: "+974", name: "Qatar", flag: "🇶🇦" },
  { code: "KW", dial_code: "+965", name: "Koweït", flag: "🇰🇼" },
  { code: "BH", dial_code: "+973", name: "Bahreïn", flag: "🇧🇭" },
  { code: "OM", dial_code: "+968", name: "Oman", flag: "🇴🇲" },
  { code: "IL", dial_code: "+972", name: "Israël", flag: "🇮🇱" },
  { code: "JO", dial_code: "+962", name: "Jordanie", flag: "🇯🇴" },
  { code: "LB", dial_code: "+961", name: "Liban", flag: "🇱🇧" },
  { code: "IQ", dial_code: "+964", name: "Irak", flag: "🇮🇶" },
  { code: "IR", dial_code: "+98", name: "Iran", flag: "🇮🇷" },
  { code: "SY", dial_code: "+963", name: "Syrie", flag: "🇸🇾" },
  { code: "YE", dial_code: "+967", name: "Yémen", flag: "🇾🇪" },
  
  // Asie de l'Est et du Sud-Est
  { code: "CN", dial_code: "+86", name: "Chine", flag: "🇨🇳" },
  { code: "JP", dial_code: "+81", name: "Japon", flag: "🇯🇵" },
  { code: "KR", dial_code: "+82", name: "Corée du Sud", flag: "🇰🇷" },
  { code: "KP", dial_code: "+850", name: "Corée du Nord", flag: "🇰🇵" },
  { code: "TH", dial_code: "+66", name: "Thaïlande", flag: "🇹🇭" },
  { code: "VN", dial_code: "+84", name: "Vietnam", flag: "🇻🇳" },
  { code: "PH", dial_code: "+63", name: "Philippines", flag: "🇵🇭" },
  { code: "ID", dial_code: "+62", name: "Indonésie", flag: "🇮🇩" },
  { code: "MY", dial_code: "+60", name: "Malaisie", flag: "🇲🇾" },
  { code: "SG", dial_code: "+65", name: "Singapour", flag: "🇸🇬" },
  { code: "MM", dial_code: "+95", name: "Myanmar", flag: "🇲🇲" },
  { code: "KH", dial_code: "+855", name: "Cambodge", flag: "🇰🇭" },
  { code: "LA", dial_code: "+856", name: "Laos", flag: "🇱🇦" },
  { code: "MO", dial_code: "+853", name: "Macao", flag: "🇲🇴" },
  { code: "HK", dial_code: "+852", name: "Hong Kong", flag: "🇭🇰" },
  { code: "TW", dial_code: "+886", name: "Taïwan", flag: "🇹🇼" },
  
  // Asie du Sud
  { code: "IN", dial_code: "+91", name: "Inde", flag: "🇮🇳" },
  { code: "PK", dial_code: "+92", name: "Pakistan", flag: "🇵🇰" },
  { code: "BD", dial_code: "+880", name: "Bangladesh", flag: "🇧🇩" },
  { code: "LK", dial_code: "+94", name: "Sri Lanka", flag: "🇱🇰" },
  { code: "NP", dial_code: "+977", name: "Népal", flag: "🇳🇵" },
  { code: "BT", dial_code: "+975", name: "Bhoutan", flag: "🇧🇹" },
  { code: "MV", dial_code: "+960", name: "Maldives", flag: "🇲🇻" },
  { code: "AF", dial_code: "+93", name: "Afghanistan", flag: "🇦🇫" },
  
  // Océanie
  { code: "AU", dial_code: "+61", name: "Australie", flag: "🇦🇺" },
  { code: "NZ", dial_code: "+64", name: "Nouvelle-Zélande", flag: "🇳🇿" },
  { code: "FJ", dial_code: "+679", name: "Fidji", flag: "🇫🇯" },
  { code: "PG", dial_code: "+675", name: "Papouasie-Nlle-Guinée", flag: "🇵🇬" },
  { code: "SB", dial_code: "+677", name: "Îles Salomon", flag: "🇸🇧" },
  { code: "VU", dial_code: "+678", name: "Vanuatu", flag: "🇻🇺" },
  { code: "NC", dial_code: "+687", name: "Nouvelle-Calédonie", flag: "🇳🇨" },
  { code: "PF", dial_code: "+689", name: "Polynésie française", flag: "🇵🇫" },
  { code: "TO", dial_code: "+676", name: "Tonga", flag: "🇹🇴" },
  { code: "WS", dial_code: "+685", name: "Samoa", flag: "🇼🇸" }
];

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function PhoneInput({ 
  value, 
  onChange, 
  className,
  disabled = false,
  placeholder
}: PhoneInputProps) {
  const { t } = useTranslation();
  
  // Extraire l'indicatif du numéro de téléphone si présent
  const extractDialCode = (phone: string): { dialCode: string, number: string } => {
    // Rechercher un indicatif connu au début du numéro
    for (const country of countryCodes) {
      if (phone.startsWith(country.dial_code)) {
        return {
          dialCode: country.dial_code,
          number: phone.substring(country.dial_code.length).trim()
        };
      }
    }
    
    // Si pas d'indicatif trouvé, assumer que c'est juste le numéro
    return {
      dialCode: "+224", // Guinée par défaut
      number: phone.startsWith('+') ? phone.substring(1).trim() : phone.trim()
    };
  };

  const { dialCode, number } = extractDialCode(value || '');
  const [selectedDialCode, setSelectedDialCode] = useState(dialCode);
  const [phoneNumber, setPhoneNumber] = useState(number);

  // Trouver le pays sélectionné
  const selectedCountry = countryCodes.find(country => country.dial_code === selectedDialCode) || countryCodes[0];

  // Mettre à jour la valeur complète lorsque l'indicatif ou le numéro change
  const updateFullValue = (newDialCode: string, newNumber: string) => {
    onChange(`${newDialCode}${newNumber}`);
  };

  return (
    <div className="flex">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={false}
            disabled={disabled}
            className="w-[110px] justify-between border-r-0 rounded-r-none"
          >
            <div className="flex items-center gap-1">
              <span>{selectedCountry.flag}</span>
              <span>{selectedDialCode}</span>
            </div>
            <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0">
          <Command>
            <CommandInput placeholder={t('members.searchCountryCode')} />
            <CommandEmpty>{t('members.noCountryCode')}</CommandEmpty>
            <CommandGroup>
              <CommandList>
                {countryCodes.map((country) => (
                  <CommandItem
                    key={country.code}
                    value={country.code}
                    onSelect={() => {
                      setSelectedDialCode(country.dial_code);
                      updateFullValue(country.dial_code, phoneNumber);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedDialCode === country.dial_code
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <span className="mr-2">{country.flag}</span>
                    <span>{country.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {country.dial_code}
                    </span>
                  </CommandItem>
                ))}
              </CommandList>
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      <Input
        type="tel"
        value={phoneNumber}
        onChange={(e) => {
          setPhoneNumber(e.target.value);
          updateFullValue(selectedDialCode, e.target.value);
        }}
        className={cn("rounded-l-none", className)}
        disabled={disabled}
        placeholder={placeholder || t('members.phoneNumberPlaceholder')}
      />
    </div>
  );
}