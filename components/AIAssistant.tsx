import React, { useState, useRef, useEffect } from 'react';
import { Mic, MessageSquare, Image as ImageIcon, Sparkles, Send, Play, Square, Wand2, Search, Zap } from 'lucide-react';
import { Transaction, ChatMessage, ImageSize } from '../types';
import * as geminiService from '../services/geminiService';

interface Props {
  transactions: Transaction[];
  onClose: () => void;
}

const AIAssistant: React.FC<Props> = ({ transactions, onClose }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'voice' | 'visuals' | 'analysis'>('chat');
  
  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [useSearch, setUseSearch] = useState(false);
  const [useFast, setUseFast] = useState(false);
  const [isChatting, setIsChatting] = useState(false);

  // Voice State
  const [isLive, setIsLive] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [nextStartTime, setNextStartTime] = useState(0);
  const liveSessionRef = useRef<any>(null);

  // Visuals State
  const [visualMode, setVisualMode] = useState<'generate' | 'edit'>('generate');
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageSize, setImageSize] = useState<ImageSize>('1K');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [editBaseImage, setEditBaseImage] = useState<string | null>(null);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Analysis State
  const [analysisResult, setAnalysisResult] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // --- Chat Handlers ---
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: chatInput };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatting(true);

    try {
      let responseText = '';
      if (useSearch) {
        const result = await geminiService.chatWithSearch(userMsg.text);
        responseText = result.text;
        if (result.sources) {
          responseText += `\n\nFuentes:\n${result.sources.map((s: any) => `- ${s.web?.title || 'Link'}: ${s.web?.uri}`).join('\n')}`;
        }
      } else if (useFast) {
        responseText = await geminiService.fastChat(userMsg.text);
      } else {
        // Default chatbot using gemini-3-pro-preview logic (from existing service or generic)
        // For simple chat we can reuse fastChat or call a generic method. 
        // Prompt implies specific models for specific tasks. Let's use fast for general if not specified.
        responseText = await geminiService.fastChat(userMsg.text); 
      }
      
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: 'model', text: responseText }]);
    } catch (e) {
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: 'model', text: "Error procesando solicitud." }]);
    } finally {
      setIsChatting(false);
    }
  };

  // --- Live Voice Handlers ---
  const toggleLiveSession = async () => {
    if (isLive) {
      if (liveSessionRef.current) {
        await liveSessionRef.current.disconnect();
        liveSessionRef.current = null;
      }
      if (audioContext) {
        audioContext.close();
        setAudioContext(null);
      }
      setIsLive(false);
    } else {
      setIsLive(true);
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      setAudioContext(ctx);
      setNextStartTime(0);

      try {
        liveSessionRef.current = await geminiService.connectLiveSession(
          async (audioBuffer) => {
            const buffer = await ctx.decodeAudioData(audioBuffer);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            
            const start = Math.max(ctx.currentTime, nextStartTime);
            source.start(start);
            setNextStartTime(start + buffer.duration);
          },
          () => setIsLive(false)
        );
      } catch (e) {
        console.error("Failed to connect live", e);
        setIsLive(false);
      }
    }
  };

  // --- Visual Handlers ---
  const handleGenerateImage = async () => {
    if (!imagePrompt) return;
    setIsGeneratingImg(true);
    try {
      const img = await geminiService.generateEducationImage(imagePrompt, imageSize);
      setGeneratedImage(img);
    } catch (e) {
      alert("Error generando imagen");
    } finally {
      setIsGeneratingImg(false);
    }
  };

  const handleEditImage = async () => {
    if (!imagePrompt || !editBaseImage) return;
    setIsGeneratingImg(true);
    try {
      // remove data prefix for service
      const base64 = editBaseImage.split(',')[1];
      const img = await geminiService.editImage(base64, imagePrompt);
      setGeneratedImage(img);
    } catch (e) {
      alert("Error editando imagen");
    } finally {
      setIsGeneratingImg(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setEditBaseImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // --- Analysis Handlers ---
  const handleDeepAnalysis = async () => {
    setIsThinking(true);
    try {
      const result = await geminiService.getFinancialAdvice("Realiza un análisis exhaustivo de la situación financiera actual, tendencias y riesgos.", transactions);
      setAnalysisResult(result);
    } catch (e) {
      setAnalysisResult("Error en el análisis.");
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Sparkles size={20} /> Asistente IA
          </h2>
          <button onClick={onClose} className="hover:bg-indigo-700 p-1 rounded">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-50 border-b border-gray-200">
          {[
            { id: 'chat', icon: MessageSquare, label: 'Chat' },
            { id: 'voice', icon: Mic, label: 'Voz' },
            { id: 'visuals', icon: ImageIcon, label: 'Visual' },
            { id: 'analysis', icon: Zap, label: 'Análisis' }
          ].map((tab: any) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 p-3 flex flex-col items-center text-xs font-medium transition-colors ${
                activeTab === tab.id ? 'text-indigo-600 bg-white border-b-2 border-indigo-600' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <tab.icon size={18} className="mb-1" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          
          {activeTab === 'chat' && (
            <div className="h-full flex flex-col">
              <div className="flex-1 space-y-4 mb-4 overflow-y-auto">
                {messages.length === 0 && (
                  <div className="text-center text-gray-400 mt-10">
                    <MessageSquare size={48} className="mx-auto mb-2 opacity-50" />
                    <p>Pregunta lo que necesites sobre tus finanzas.</p>
                  </div>
                )}
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                      m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'
                    }`}>
                      <p className="whitespace-pre-wrap">{m.text}</p>
                    </div>
                  </div>
                ))}
                {isChatting && <div className="text-xs text-gray-400 animate-pulse">Escribiendo...</div>}
              </div>
              
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button 
                    onClick={() => setUseSearch(!useSearch)}
                    className={`px-2 py-1 text-xs rounded border flex items-center gap-1 ${useSearch ? 'bg-blue-50 text-blue-600 border-blue-200' : 'text-gray-500'}`}
                  >
                    <Search size={12} /> Google Search
                  </button>
                  <button 
                    onClick={() => setUseFast(!useFast)}
                    className={`px-2 py-1 text-xs rounded border flex items-center gap-1 ${useFast ? 'bg-yellow-50 text-yellow-600 border-yellow-200' : 'text-gray-500'}`}
                  >
                    <Zap size={12} /> Fast (Flash Lite)
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Escribe tu consulta..."
                    className="flex-1 p-2 border rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={isChatting}
                    className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'voice' && (
            <div className="h-full flex flex-col items-center justify-center space-y-8 text-center">
              <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${isLive ? 'bg-red-50 animate-pulse' : 'bg-gray-50'}`}>
                <div className={`w-24 h-24 rounded-full flex items-center justify-center ${isLive ? 'bg-red-100' : 'bg-gray-100'}`}>
                  <Mic size={48} className={isLive ? 'text-red-600' : 'text-gray-400'} />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{isLive ? 'Escuchando...' : 'Modo Conversación'}</h3>
                <p className="text-sm text-gray-500 max-w-xs mx-auto">
                  {isLive 
                    ? 'Habla naturalmente con el asistente para gestionar tus finanzas en tiempo real.' 
                    : 'Inicia una llamada de voz para interactuar sin manos.'}
                </p>
              </div>
              <button
                onClick={toggleLiveSession}
                className={`flex items-center gap-2 px-8 py-3 rounded-full font-semibold transition-colors ${
                  isLive ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {isLive ? <><Square size={18} fill="currentColor" /> Finalizar</> : <><Play size={18} fill="currentColor" /> Iniciar Conversación</>}
              </button>
            </div>
          )}

          {activeTab === 'visuals' && (
            <div className="space-y-6">
              <div className="flex rounded-lg bg-gray-100 p-1">
                <button
                  onClick={() => setVisualMode('generate')}
                  className={`flex-1 py-1 text-sm rounded-md font-medium transition-all ${visualMode === 'generate' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}
                >
                  Generar (Pro)
                </button>
                <button
                  onClick={() => setVisualMode('edit')}
                  className={`flex-1 py-1 text-sm rounded-md font-medium transition-all ${visualMode === 'edit' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}
                >
                  Editar (Flash)
                </button>
              </div>

              {visualMode === 'generate' ? (
                <div className="space-y-4">
                   <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Tamaño</label>
                    <select 
                      value={imageSize}
                      onChange={(e) => setImageSize(e.target.value as ImageSize)}
                      className="w-full p-2 border rounded-lg text-sm"
                    >
                      <option value="1K">1K (Standard)</option>
                      <option value="2K">2K (High Res)</option>
                      <option value="4K">4K (Ultra)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Prompt</label>
                    <textarea 
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="Describe la imagen a generar..."
                      className="w-full p-2 border rounded-lg text-sm h-24 resize-none"
                    />
                  </div>
                  <button 
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImg}
                    className="w-full py-2 bg-indigo-600 text-white rounded-lg flex justify-center items-center gap-2"
                  >
                    {isGeneratingImg ? <Wand2 className="animate-spin" size={16}/> : <Wand2 size={16}/>}
                    Generar Imagen
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50"
                  >
                    {editBaseImage ? (
                      <img src={editBaseImage} alt="Base" className="max-h-32 mx-auto rounded" />
                    ) : (
                      <div className="text-gray-400 text-sm">
                        <ImageIcon className="mx-auto mb-2" />
                        Click para subir imagen base
                      </div>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                  </div>
                  <textarea 
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="Ej: 'Añadir filtro retro', 'Quitar fondo'..."
                    className="w-full p-2 border rounded-lg text-sm h-20 resize-none"
                  />
                  <button 
                    onClick={handleEditImage}
                    disabled={isGeneratingImg || !editBaseImage}
                    className="w-full py-2 bg-purple-600 text-white rounded-lg flex justify-center items-center gap-2 disabled:opacity-50"
                  >
                    {isGeneratingImg ? <Wand2 className="animate-spin" size={16}/> : <Wand2 size={16}/>}
                    Editar Imagen
                  </button>
                </div>
              )}

              {generatedImage && (
                <div className="mt-4 border rounded-lg p-2">
                  <p className="text-xs text-gray-500 mb-2">Resultado:</p>
                  <img src={generatedImage} alt="Generated" className="w-full rounded-lg shadow-sm" />
                </div>
              )}
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="h-full flex flex-col">
              <div className="bg-blue-50 p-4 rounded-xl mb-4 text-blue-800 text-sm">
                <p className="font-semibold flex items-center gap-2 mb-1">
                  <Zap size={16} /> Thinking Mode Activo
                </p>
                <p>Gemini Pro utilizará 32k tokens de pensamiento para analizar profundamente tus transacciones recientes.</p>
              </div>
              
              {!analysisResult && !isThinking && (
                <button
                  onClick={handleDeepAnalysis}
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-transform active:scale-95 flex flex-col items-center justify-center gap-2"
                >
                  <Sparkles size={24} />
                  Iniciar Análisis Financiero
                </button>
              )}

              {isThinking && (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                  <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                  <p>Analizando datos complejos...</p>
                </div>
              )}

              {analysisResult && (
                <div className="flex-1 overflow-y-auto bg-gray-50 p-4 rounded-xl text-sm leading-relaxed text-gray-700 whitespace-pre-wrap border border-gray-200">
                  {analysisResult}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AIAssistant;