import React from 'react';
import { Volume2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface VoiceSelectorProps {
  voices: SpeechSynthesisVoice[];
  selectedVoice: string | null;
  onVoiceChange: (voiceName: string) => void;
  disabled?: boolean;
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  voices,
  selectedVoice,
  onVoiceChange,
  disabled = false,
}) => {
  // Filter to show Hindi and Indian English voices first, then others
  const sortedVoices = React.useMemo(() => {
    const hindiVoices = voices.filter(v => v.lang.startsWith('hi'));
    const indianEnglish = voices.filter(v => v.lang === 'en-IN');
    const otherEnglish = voices.filter(v => v.lang.startsWith('en') && v.lang !== 'en-IN');
    
    return [...hindiVoices, ...indianEnglish, ...otherEnglish];
  }, [voices]);

  const getVoiceLabel = (voice: SpeechSynthesisVoice): string => {
    const langLabels: Record<string, string> = {
      'hi-IN': '🇮🇳 Hindi',
      'hi': '🇮🇳 Hindi',
      'en-IN': '🇮🇳 English (India)',
      'en-US': '🇺🇸 English (US)',
      'en-GB': '🇬🇧 English (UK)',
    };
    
    const langLabel = langLabels[voice.lang] || voice.lang;
    return `${voice.name} - ${langLabel}`;
  };

  if (sortedVoices.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Volume2 className="h-4 w-4 text-muted-foreground" />
      <Select
        value={selectedVoice || undefined}
        onValueChange={onVoiceChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-[200px] h-8 text-xs bg-background">
          <SelectValue placeholder="Voice चुनें" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px] bg-background z-50">
          {sortedVoices.map((voice) => (
            <SelectItem 
              key={voice.name} 
              value={voice.name}
              className="text-xs"
            >
              {getVoiceLabel(voice)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default VoiceSelector;
