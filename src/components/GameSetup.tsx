'use client';

import { useState } from 'react';
import { GameRules, defaultRules } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  UserPlus, 
  Trash2, 
  Play, 
  Settings, 
  ChevronDown,
  Info,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GameSetupProps {
  onStartGame: (playerNames: string[], rules: GameRules, initialCards: number) => void;
}

export function GameSetup({ onStartGame }: GameSetupProps) {
  const [players, setPlayers] = useState<string[]>(['', '']);
  const [rules, setRules] = useState<GameRules>(defaultRules);
  const [initialCards, setInitialCards] = useState(5);
  const [showRules, setShowRules] = useState(false);

  const addPlayer = () => {
    if (players.length < 4) {
      setPlayers([...players, '']);
    }
  };

  const removePlayer = (index: number) => {
    if (players.length > 2) {
      setPlayers(players.filter((_, i) => i !== index));
    }
  };

  const updatePlayer = (index: number, name: string) => {
    const newPlayers = [...players];
    newPlayers[index] = name;
    setPlayers(newPlayers);
  };

  const toggleRule = (key: keyof GameRules) => {
    setRules(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleStartGame = () => {
    const validNames = players.map((name, index) => 
      name.trim() || `Spieler ${index + 1}`
    );
    onStartGame(validNames, rules, initialCards);
  };

  const canStartGame = players.length >= 2;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-blue-50 p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/logo.png" alt="Mau Mau" className="w-16 h-16 rounded-xl shadow-lg" />
            <div>
              <h1 className="text-4xl font-bold text-gray-800">
                Mau Mau
              </h1>
              <p className="text-gray-500">Das deutsche Kartenspiel</p>
            </div>
          </div>
        </div>

        {/* Player Setup Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Spieler
            </CardTitle>
            <CardDescription>
              Füge 2-4 Spieler hinzu. Mindestens 2 Spieler erforderlich.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {players.map((player, index) => (
              <div key={index} className="flex items-center gap-2">
                <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                  {index + 1}
                </Badge>
                <Input
                  placeholder={`Spieler ${index + 1}`}
                  value={player}
                  onChange={(e) => updatePlayer(index, e.target.value)}
                  className="flex-1"
                />
                {players.length > 2 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removePlayer(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}

            {players.length < 4 && (
              <Button
                variant="outline"
                onClick={addPlayer}
                className="w-full border-dashed"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Spieler hinzufügen
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Initial Cards Setting */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Karten pro Spieler
            </CardTitle>
            <CardDescription>
              Wie viele Karten erhält jeder Spieler zu Beginn?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Slider
                value={[initialCards]}
                onValueChange={(value) => setInitialCards(value[0])}
                min={3}
                max={8}
                step={1}
                className="flex-1"
              />
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {initialCards}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Rules Configuration */}
        <Collapsible open={showRules} onOpenChange={setShowRules}>
          <Card className="shadow-lg">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Spielregeln
                  </div>
                  <ChevronDown className={cn(
                    'w-5 h-5 transition-transform duration-200',
                    showRules && 'rotate-180'
                  )} />
                </CardTitle>
                <CardDescription>
                  Konfiguriere die Sonderregeln für dieses Spiel
                </CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <Separator />
                
                {/* Mau Rules */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-gray-700 uppercase tracking-wide">
                    Mau-Regeln
                  </h4>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-gray-400" />
                      <div>
                        <Label htmlFor="mauSagen" className="font-medium">
                          Mau sagen
                        </Label>
                        <p className="text-sm text-gray-500">
                          Bei der vorletzten Karte "Mau" sagen
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="mauSagen"
                      checked={rules.mauSagen}
                      onCheckedChange={() => toggleRule('mauSagen')}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-gray-400" />
                      <div>
                        <Label htmlFor="mauMauSagen" className="font-medium">
                          Mau Mau sagen
                        </Label>
                        <p className="text-sm text-gray-500">
                          Bei der letzten Karte "Mau Mau" sagen
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="mauMauSagen"
                      checked={rules.mauMauSagen}
                      onCheckedChange={() => toggleRule('mauMauSagen')}
                    />
                  </div>
                </div>

                <Separator />

                {/* Special Card Rules */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-gray-700 uppercase tracking-wide">
                    Sonderkarten
                  </h4>

                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-blue-700">7</span>
                      <div>
                        <Label htmlFor="siebenRegel" className="font-medium">
                          Sieben-Regel
                        </Label>
                        <p className="text-sm text-gray-500">
                          Nächster Spieler zieht 2 Karten
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="siebenRegel"
                      checked={rules.siebenRegel}
                      onCheckedChange={() => toggleRule('siebenRegel')}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-purple-700">8</span>
                      <div>
                        <Label htmlFor="achtRegel" className="font-medium">
                          Acht-Regel
                        </Label>
                        <p className="text-sm text-gray-500">
                          Nächster Spieler wird übersprungen
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="achtRegel"
                      checked={rules.achtRegel}
                      onCheckedChange={() => toggleRule('achtRegel')}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-amber-700">9</span>
                      <div>
                        <Label htmlFor="neunRegel" className="font-medium">
                          Neun-Regel
                        </Label>
                        <p className="text-sm text-gray-500">
                          Spielrichtung wird umgekehrt
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="neunRegel"
                      checked={rules.neunRegel}
                      onCheckedChange={() => toggleRule('neunRegel')}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-red-700">B</span>
                      <div>
                        <Label htmlFor="bubeRegel" className="font-medium">
                          Bube-Regel
                        </Label>
                        <p className="text-sm text-gray-500">
                          Wünsche eine Farbe (kann auf jede Karte gelegt werden)
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="bubeRegel"
                      checked={rules.bubeRegel}
                      onCheckedChange={() => toggleRule('bubeRegel')}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-green-700">A</span>
                      <div>
                        <Label htmlFor="assRegel" className="font-medium">
                          Ass-Regel
                        </Label>
                        <p className="text-sm text-gray-500">
                          Wünsche eine Farbe
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="assRegel"
                      checked={rules.assRegel}
                      onCheckedChange={() => toggleRule('assRegel')}
                    />
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Start Game Button */}
        <Button
          onClick={handleStartGame}
          disabled={!canStartGame}
          size="lg"
          className={cn(
            'w-full h-14 text-lg font-semibold transition-all duration-300',
            canStartGame
              ? 'bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl'
              : 'bg-gray-300 cursor-not-allowed'
          )}
        >
          <Play className="w-5 h-5 mr-2" />
          Spiel starten
        </Button>

        {/* Quick info */}
        <p className="text-center text-sm text-gray-500">
          Das Spiel wird im lokalen Mehrspielermodus gespielt.
          <br />
          Spieler wechseln sich am selben Gerät ab.
        </p>
      </div>
    </div>
  );
}

export default GameSetup;
