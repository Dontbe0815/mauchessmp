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
  Users, 
  Play, 
  Settings, 
  ChevronDown,
  Info,
  Sparkles,
  LogIn,
  Copy,
  Check,
  Crown,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoomInfo {
  code: string;
  hostId: string;
  players: Array<{
    id: string;
    name: string;
    isHost: boolean;
    isConnected: boolean;
  }>;
  rules: GameRules;
  initialCardCount: number;
  status: string;
}

interface MultiplayerLobbyProps {
  onCreateRoom: (playerName: string, rules: GameRules, initialCards: number) => Promise<{ success: boolean; error?: string }>;
  onJoinRoom: (roomCode: string, playerName: string) => Promise<{ success: boolean; error?: string }>;
  onStartGame?: () => Promise<{ success: boolean; error?: string }>;
  onLeaveRoom?: () => void;
  roomInfo?: RoomInfo | null;
  isHost: boolean;
  isConnected: boolean;
  error?: string | null;
  onClearError?: () => void;
}

export function MultiplayerLobby({
  onCreateRoom,
  onJoinRoom,
  onStartGame,
  onLeaveRoom,
  roomInfo,
  isHost,
  isConnected,
  error,
  onClearError,
}: MultiplayerLobbyProps) {
  const [mode, setMode] = useState<'select' | 'create' | 'lobby' | 'join'>('select');
  const [playerName, setPlayerName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [rules, setRules] = useState<GameRules>(defaultRules);
  const [initialCards, setInitialCards] = useState(5);
  const [showRules, setShowRules] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const toggleRule = (key: keyof GameRules) => {
    setRules(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCreateRoom = async () => {
    if (!playerName.trim()) return;
    setIsLoading(true);
    const result = await onCreateRoom(playerName.trim(), rules, initialCards);
    setIsLoading(false);
    if (result.success) {
      setMode('lobby');
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim() || !roomCodeInput.trim()) return;
    setIsLoading(true);
    const result = await onJoinRoom(roomCodeInput.trim(), playerName.trim());
    setIsLoading(false);
    if (result.success) {
      setMode('lobby');
    }
  };

  const handleStartGame = async () => {
    if (!onStartGame) return;
    setIsLoading(true);
    await onStartGame();
    setIsLoading(false);
  };

  const copyRoomCode = () => {
    if (roomInfo?.code) {
      navigator.clipboard.writeText(roomInfo.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Mode: Select (Create or Join)
  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-blue-50 p-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src="/logo.png" alt="Mau Mau" className="w-16 h-16 rounded-xl shadow-lg" />
              <div>
                <h1 className="text-4xl font-bold text-gray-800">Mau Mau</h1>
                <p className="text-gray-500">Online Multiplayer</p>
              </div>
            </div>
          </div>

          {error && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4 flex items-center justify-between">
                <span className="text-red-700">{error}</span>
                <Button variant="ghost" size="sm" onClick={onClearError}>✕</Button>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Spiel beitreten</CardTitle>
              <CardDescription>Erstelle einen neuen Raum oder trete einem bestehenden bei</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => setMode('create')} className="w-full h-16 text-lg bg-green-600 hover:bg-green-700" size="lg">
                <Crown className="w-5 h-5 mr-2" />
                Neuen Raum erstellen
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">oder</span>
                </div>
              </div>

              <Button onClick={() => setMode('join')} variant="outline" className="w-full h-16 text-lg" size="lg">
                <LogIn className="w-5 h-5 mr-2" />
                Raum beitreten
              </Button>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-gray-500">
            Spiele mit Freunden online! Teile den Raumcode mit anderen Spielern.
          </p>
        </div>
      </div>
    );
  }

  // Mode: Create Room
  if (mode === 'create') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-blue-50 p-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center mb-4">
            <h1 className="text-3xl font-bold text-gray-800">Raum erstellen</h1>
            <p className="text-gray-500">Konfiguriere dein Spiel</p>
          </div>

          {error && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4 flex items-center justify-between">
                <span className="text-red-700">{error}</span>
                <Button variant="ghost" size="sm" onClick={onClearError}>✕</Button>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />Dein Name</CardTitle>
            </CardHeader>
            <CardContent>
              <Input placeholder="Dein Spielername" value={playerName} onChange={(e) => setPlayerName(e.target.value)} className="text-lg" maxLength={20} />
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5" />Karten pro Spieler</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Slider value={[initialCards]} onValueChange={(value) => setInitialCards(value[0])} min={3} max={8} step={1} className="flex-1" />
                <Badge variant="secondary" className="text-lg px-4 py-2">{initialCards}</Badge>
              </div>
            </CardContent>
          </Card>

          <Collapsible open={showRules} onOpenChange={setShowRules}>
            <Card className="shadow-lg">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><Settings className="w-5 h-5" />Spielregeln</div>
                    <ChevronDown className={cn('w-5 h-5 transition-transform duration-200', showRules && 'rotate-180')} />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4 pt-0">
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-gray-700 uppercase tracking-wide">Mau-Regeln</h4>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-gray-400" />
                        <div>
                          <Label className="font-medium">Mau sagen</Label>
                          <p className="text-sm text-gray-500">Bei der vorletzten Karte "Mau" sagen</p>
                        </div>
                      </div>
                      <Switch checked={rules.mauSagen} onCheckedChange={() => toggleRule('mauSagen')} />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-gray-400" />
                        <div>
                          <Label className="font-medium">Mau Mau sagen</Label>
                          <p className="text-sm text-gray-500">Bei der letzten Karte "Mau Mau" sagen</p>
                        </div>
                      </div>
                      <Switch checked={rules.mauMauSagen} onCheckedChange={() => toggleRule('mauMauSagen')} />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-gray-700 uppercase tracking-wide">Sonderkarten</h4>

                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-blue-700">7</span>
                        <div>
                          <Label className="font-medium">Sieben-Regel</Label>
                          <p className="text-sm text-gray-500">Nächster Spieler zieht 2 Karten</p>
                        </div>
                      </div>
                      <Switch checked={rules.siebenRegel} onCheckedChange={() => toggleRule('siebenRegel')} />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-purple-700">8</span>
                        <div>
                          <Label className="font-medium">Acht-Regel</Label>
                          <p className="text-sm text-gray-500">Nächster Spieler wird übersprungen</p>
                        </div>
                      </div>
                      <Switch checked={rules.achtRegel} onCheckedChange={() => toggleRule('achtRegel')} />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-amber-700">9</span>
                        <div>
                          <Label className="font-medium">Neun-Regel</Label>
                          <p className="text-sm text-gray-500">Spielrichtung wird umgekehrt</p>
                        </div>
                      </div>
                      <Switch checked={rules.neunRegel} onCheckedChange={() => toggleRule('neunRegel')} />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-red-700">B</span>
                        <div>
                          <Label className="font-medium">Bube-Regel</Label>
                          <p className="text-sm text-gray-500">Wünsche eine Farbe</p>
                        </div>
                      </div>
                      <Switch checked={rules.bubeRegel} onCheckedChange={() => toggleRule('bubeRegel')} />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-green-700">A</span>
                        <div>
                          <Label className="font-medium">Ass-Regel</Label>
                          <p className="text-sm text-gray-500">Wünsche eine Farbe</p>
                        </div>
                      </div>
                      <Switch checked={rules.assRegel} onCheckedChange={() => toggleRule('assRegel')} />
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setMode('select')} className="flex-1" size="lg">Zurück</Button>
            <Button onClick={handleCreateRoom} disabled={!playerName.trim() || isLoading} className="flex-1 bg-green-600 hover:bg-green-700" size="lg">
              {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Play className="w-5 h-5 mr-2" />}
              Raum erstellen
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Mode: Join Room
  if (mode === 'join') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-blue-50 p-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center mb-4">
            <h1 className="text-3xl font-bold text-gray-800">Raum beitreten</h1>
            <p className="text-gray-500">Gib den Raumcode ein</p>
          </div>

          {error && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4 flex items-center justify-between">
                <span className="text-red-700">{error}</span>
                <Button variant="ghost" size="sm" onClick={onClearError}>✕</Button>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-lg">
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="roomCode" className="text-lg">Raumcode</Label>
                <Input id="roomCode" placeholder="ABCD" value={roomCodeInput} onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())} className="text-2xl text-center tracking-widest uppercase" maxLength={4} />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="playerName" className="text-lg">Dein Name</Label>
                <Input id="playerName" placeholder="Dein Spielername" value={playerName} onChange={(e) => setPlayerName(e.target.value)} className="text-lg" maxLength={20} />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setMode('select')} className="flex-1" size="lg">Zurück</Button>
            <Button onClick={handleJoinRoom} disabled={!playerName.trim() || !roomCodeInput.trim() || isLoading} className="flex-1 bg-green-600 hover:bg-green-700" size="lg">
              {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <LogIn className="w-5 h-5 mr-2" />}
              Beitreten
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Mode: Lobby (waiting for players)
  if (mode === 'lobby' && roomInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-blue-50 p-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center mb-4">
            <h1 className="text-3xl font-bold text-gray-800">Warteraum</h1>
            <p className="text-gray-500">Warte auf andere Spieler</p>
          </div>

          {error && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4 flex items-center justify-between">
                <span className="text-red-700">{error}</span>
                <Button variant="ghost" size="sm" onClick={onClearError}>✕</Button>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <CardContent className="p-6 text-center">
              <p className="text-sm mb-2 opacity-80">Raumcode</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-5xl font-bold tracking-widest">{roomInfo.code}</span>
                <Button variant="ghost" size="icon" onClick={copyRoomCode} className="text-white hover:bg-white/20">
                  {copied ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
                </Button>
              </div>
              <p className="text-sm mt-2 opacity-80">Teile diesen Code mit deinen Freunden!</p>
            </CardContent>
          </Card>

          <div className="flex items-center justify-center gap-2">
            <div className={cn('w-3 h-3 rounded-full', isConnected ? 'bg-green-500' : 'bg-red-500')} />
            <span className="text-sm text-gray-600">{isConnected ? 'Verbunden' : 'Verbinde...'}</span>
          </div>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Users className="w-5 h-5" />Spieler</div>
                <Badge variant="secondary">{roomInfo.players.length}/4</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {roomInfo.players.map((player, index) => (
                <div key={player.id} className={cn('flex items-center gap-3 p-3 rounded-lg', player.isHost ? 'bg-amber-50' : 'bg-gray-50')}>
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 font-bold">{index + 1}</div>
                  <span className="flex-1 font-medium">{player.name}</span>
                  {player.isHost && <Crown className="w-5 h-5 text-amber-500" />}
                  <div className={cn('w-3 h-3 rounded-full', player.isConnected ? 'bg-green-500' : 'bg-gray-300')} />
                </div>
              ))}
              
              {roomInfo.players.length < 2 && (
                <p className="text-center text-gray-500 text-sm mt-4">Warte auf weitere Spieler... (min. 2)</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Spieleinstellungen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">{roomInfo.initialCardCount} Karten</Badge>
                {roomInfo.rules.siebenRegel && <Badge variant="outline">7-Regel</Badge>}
                {roomInfo.rules.achtRegel && <Badge variant="outline">8-Regel</Badge>}
                {roomInfo.rules.neunRegel && <Badge variant="outline">9-Regel</Badge>}
                {roomInfo.rules.bubeRegel && <Badge variant="outline">Bube-Regel</Badge>}
                {roomInfo.rules.assRegel && <Badge variant="outline">Ass-Regel</Badge>}
                {roomInfo.rules.mauSagen && <Badge variant="outline">Mau</Badge>}
                {roomInfo.rules.mauMauSagen && <Badge variant="outline">Mau Mau</Badge>}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button variant="outline" onClick={onLeaveRoom} className="flex-1" size="lg">Verlassen</Button>
            {isHost && (
              <Button onClick={handleStartGame} disabled={roomInfo.players.length < 2 || isLoading} className="flex-1 bg-green-600 hover:bg-green-700" size="lg">
                {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Play className="w-5 h-5 mr-2" />}
                Spiel starten
              </Button>
            )}
            {!isHost && (
              <div className="flex-1 text-center py-3 text-gray-500">
                <p className="text-sm">Warte auf den Host...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default MultiplayerLobby;
