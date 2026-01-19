import React, { useState, useEffect } from 'react';
import { AppState, GeneratedCreative, User } from './types';
import { generateCreatives, enhancePrompt, analyzeBrandAssets, generateSocialCaption } from './services/geminiService';
import { loginUser, registerUser, logoutUser, getCurrentSession, getUsers, deleteUser, toggleUserRole, approveUser, createUserByAdmin, blockUser, checkDatabaseConnection } from './services/authService';
import { saveCreative, fetchCreatives, updateCaptionInDb } from './services/dataService'; 
import { isFirebaseConfigured } from './lib/firebaseClient'; 
import { Layout, Sidebar, Search, Zap, Image as ImageIcon, CheckCircle, RotateCcw, Download, Sparkles, Layers, Palette, AlertCircle, Key, Edit3, Grid, Monitor, Video, Megaphone, UploadCloud, Trash2, Wand2, ScanFace, Loader2, MousePointerClick, Lock, Unlock, Ban, MessageSquare, Copy, Smile, AlignCenter, User as UserIcon, LogOut, Shield, ShieldAlert, Users, UserPlus, Check, XCircle, Settings, X, Cloud, CloudOff, Database, Eye, EyeOff, Flame, ExternalLink } from 'lucide-react';
import { STYLES, FORMATS, OBJECTIVES, NICHES, CATEGORIES, MOODS, TEXT_POSITIONS } from './constants';

// --- Components ---

const LoginScreen = ({ onLoginSuccess }: { onLoginSuccess: (user: User) => void }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [firebaseStatus, setFirebaseStatus] = useState<boolean>(false);

  useEffect(() => {
      setFirebaseStatus(isFirebaseConfigured());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      if (isRegistering) {
        await registerUser(username, password);
        setSuccessMsg("Conta criada com sucesso! Você já pode fazer login.");
        setIsRegistering(false); 
        setUsername('');
        setPassword('');
      } else {
        const user = await loginUser(username, password);
        onLoginSuccess(user);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[128px] pointer-events-none" />

      <div className="w-full max-w-md bg-surface/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
           <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
             <Sparkles className="text-white w-6 h-6" />
           </div>
           <h1 className="text-2xl font-bold text-white tracking-tight">Azul Creative IA</h1>
           
           <div className={`mt-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center border ${firebaseStatus ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-white/5 border-white/10 text-textMuted'}`}>
               {firebaseStatus ? (
                   <>
                     <Flame className="w-3 h-3 mr-1.5" />
                     Nuvem Conectada
                   </>
               ) : (
                   <>
                     <CloudOff className="w-3 h-3 mr-1.5" />
                     Modo Local (Offline)
                   </>
               )}
           </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-2">Usuário</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                placeholder="Seu nome de usuário"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-2">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 mr-2" />
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center text-green-300 text-xs">
              <CheckCircle className="w-4 h-4 mr-2" />
              {successMsg}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary hover:bg-primaryHover disabled:opacity-50 text-white font-bold py-3 rounded-lg shadow-lg shadow-primary/20 transition-all uppercase tracking-wider text-xs flex justify-center items-center"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRegistering ? 'Criar Conta' : 'Entrar na Plataforma')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => { setIsRegistering(!isRegistering); setError(null); setSuccessMsg(null); }}
            className="text-textMuted hover:text-white text-xs transition-colors underline decoration-border hover:decoration-white underline-offset-4"
          >
            {isRegistering ? 'Já tem uma conta? Faça login' : 'Não tem conta? Cadastre-se'}
          </button>
        </div>
      </div>
    </div>
  );
};

const SettingsModal = ({ onClose }: { onClose: () => void }) => {
    const [apiKey, setApiKey] = useState('');
    const [savedKey, setSavedKey] = useState('');

    useEffect(() => {
        const stored = localStorage.getItem("USER_GEMINI_KEY");
        if (stored) setSavedKey(stored);
    }, []);

    const handleSave = () => {
        if (apiKey.trim().length > 0) {
            localStorage.setItem("USER_GEMINI_KEY", apiKey.trim());
            setSavedKey(apiKey.trim());
            setApiKey('');
            alert("Chave salva com sucesso!");
        }
    };

    const handleClear = () => {
        localStorage.removeItem("USER_GEMINI_KEY");
        setSavedKey('');
        alert("Chave removida. O sistema não funcionará sem uma chave.");
    };

    return (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-surface border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
                <div className="p-6 border-b border-border flex justify-between items-center bg-sidebar">
                    <h2 className="text-lg font-bold text-white flex items-center">
                        <Settings className="w-5 h-5 mr-2 text-primary" /> Configuração da IA
                    </h2>
                    <button onClick={onClose} className="text-textMuted hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg mb-4 flex items-start">
                             <AlertCircle className="w-5 h-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
                             <p className="text-xs text-yellow-200">
                                <strong>Chave API Obrigatória:</strong> Para gerar imagens, você precisa inserir sua própria chave do Google Gemini.
                             </p>
                        </div>

                        <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-2">Sua API Key (Gemini)</label>
                        
                        {savedKey ? (
                            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-between mb-4">
                                <div className="flex items-center text-green-400 text-xs">
                                    <Key className="w-4 h-4 mr-2" />
                                    <span className="font-bold">Chave Configurada</span>
                                </div>
                                <button onClick={handleClear} className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase underline">Remover</button>
                            </div>
                        ) : (
                             <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center text-red-400 text-xs mb-4">
                                <ShieldAlert className="w-4 h-4 mr-2" />
                                <span className="font-bold">Nenhuma chave encontrada</span>
                            </div>
                        )}

                        <div className="relative">
                            <input 
                                type="text" 
                                value={apiKey} 
                                onChange={(e) => setApiKey(e.target.value)} 
                                placeholder="Cole sua chave aqui (AIzaSy...)" 
                                className="w-full bg-background border border-border rounded-lg pl-4 pr-4 py-3 text-sm text-white focus:outline-none focus:border-primary"
                            />
                        </div>
                    </div>
                    <button onClick={handleSave} disabled={!apiKey} className="w-full bg-primary hover:bg-primaryHover disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg text-xs uppercase tracking-wider transition-colors">
                        Salvar Chave
                    </button>
                    <div className="text-center pt-2">
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-accent hover:underline">Clique aqui para obter uma chave gratuita no Google AI Studio ↗</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AdminPanel = ({ currentUser, onClose }: { currentUser: User; onClose: () => void }) => {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [loading, setLoading] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  const refreshList = async () => {
      setLoading(true);
      try {
          const list = await getUsers();
          setUsersList(list);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => { refreshList(); }, []);

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este usuário?")) {
      try { await deleteUser(id); refreshList(); } catch (e: any) { alert(e.message); }
    }
  };

  const handleRoleToggle = async (id: string) => {
    try { await toggleUserRole(id); refreshList(); } catch (e: any) { alert(e.message); }
  };

  const handleApprove = async (id: string) => {
      try { await approveUser(id); refreshList(); } catch (e: any) { alert(e.message); }
  };

  const handleBlock = async (id: string) => {
      try { await blockUser(id); refreshList(); } catch (e: any) { alert(e.message); }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          await createUserByAdmin(newUsername, newPassword, newRole);
          setCreateMsg(`Usuário ${newUsername} criado com sucesso!`);
          setNewUsername('');
          setNewPassword('');
          setNewRole('user');
          refreshList();
          setTimeout(() => setCreateMsg(null), 3000);
      } catch (e: any) {
          alert(e.message);
      }
  };

  const totalUsers = usersList.length;
  const activeUsers = usersList.filter(u => u.status === 'active').length;
  const pendingUsers = usersList.filter(u => u.status === 'pending').length;

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-6">
       <div className="bg-surface border border-border w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="p-6 border-b border-border flex justify-between items-center bg-sidebar">
             <div className="flex items-center space-x-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                   <ShieldAlert className="w-6 h-6 text-accent" />
                </div>
                <div>
                   <h2 className="text-xl font-bold text-white">Painel Administrativo</h2>
                   <p className="text-xs text-textMuted uppercase tracking-wider flex items-center">
                       Gestão de Acessos • 
                       {isFirebaseConfigured() ? (
                           <span className="text-orange-400 ml-1 flex items-center"><Flame className="w-3 h-3 mr-1"/> Nuvem Ativa</span>
                       ) : (
                           <span className="text-textMuted ml-1 flex items-center"><CloudOff className="w-3 h-3 mr-1"/> Modo Local</span>
                       )}
                   </p>
                </div>
             </div>
             <div className="flex items-center space-x-4">
                 <a 
                   href="https://console.firebase.google.com/u/0/project/azul-creative-ia/authentication/users" 
                   target="_blank" 
                   rel="noreferrer"
                   className="hidden md:flex items-center space-x-2 text-[10px] text-textMuted hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded transition-colors"
                 >
                    <ExternalLink className="w-3 h-3" />
                    <span>Abrir Firebase Console</span>
                 </a>
                 <div className="flex space-x-2">
                    <button onClick={() => setActiveTab('list')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'list' ? 'bg-primary text-white' : 'bg-white/5 text-textMuted hover:text-white'}`}>
                        Listar Usuários
                    </button>
                    <button onClick={() => setActiveTab('create')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'create' ? 'bg-primary text-white' : 'bg-white/5 text-textMuted hover:text-white'}`}>
                        Cadastrar Novo
                    </button>
                 </div>
                 <button onClick={onClose} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors" title="Fechar Painel">
                    <X className="w-5 h-5" />
                 </button>
             </div>
          </div>

          {activeTab === 'list' && (
            <div className="px-6 py-4 bg-surface/50 border-b border-border grid grid-cols-3 gap-4">
                <div className="bg-background/50 border border-white/5 p-3 rounded-lg flex items-center justify-between">
                    <div>
                        <p className="text-[10px] text-textMuted uppercase tracking-wider font-bold">Total Usuários</p>
                        <p className="text-xl font-bold text-white">{loading ? '...' : totalUsers}</p>
                    </div>
                    <Users className="w-5 h-5 text-primary opacity-50" />
                </div>
                <div className="bg-background/50 border border-white/5 p-3 rounded-lg flex items-center justify-between">
                    <div>
                        <p className="text-[10px] text-textMuted uppercase tracking-wider font-bold">Ativos</p>
                        <p className="text-xl font-bold text-green-400">{loading ? '...' : activeUsers}</p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-400 opacity-50" />
                </div>
                <div className="bg-background/50 border border-white/5 p-3 rounded-lg flex items-center justify-between">
                    <div>
                        <p className="text-[10px] text-textMuted uppercase tracking-wider font-bold">Pendentes</p>
                        <p className="text-xl font-bold text-yellow-400">{loading ? '...' : pendingUsers}</p>
                    </div>
                    <AlertCircle className="w-5 h-5 text-yellow-400 opacity-50" />
                </div>
            </div>
          )}

          <div className="flex-1 overflow-auto p-6 bg-surface/50">
             {activeTab === 'create' && (
                 <div className="max-w-md mx-auto mt-10 p-8 bg-sidebar border border-border rounded-2xl shadow-lg">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center"><UserPlus className="w-5 h-5 mr-2 text-accent" /> Cadastrar Usuário</h3>
                    <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-200">
                        <p><strong>Nota de Segurança:</strong> Ao criar usuários manualmente aqui, eles serão salvos no banco de dados local ou Firestore, mas não criarão automaticamente credenciais de Auth se estiver usando o Firebase Client. Para criar acessos reais no Firebase, use a página de Registro ou o Console do Firebase.</p>
                    </div>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-2">Login</label>
                            <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} required className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-2">Senha</label>
                            <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none" />
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-2">Função</label>
                             <div className="flex space-x-4">
                                 <label className="flex items-center space-x-2 cursor-pointer">
                                     <input type="radio" checked={newRole === 'user'} onChange={() => setNewRole('user')} className="accent-primary" />
                                     <span className="text-sm text-white">Usuário Normal</span>
                                 </label>
                                 <label className="flex items-center space-x-2 cursor-pointer">
                                     <input type="radio" checked={newRole === 'admin'} onChange={() => setNewRole('admin')} className="accent-primary" />
                                     <span className="text-sm text-white">Administrador</span>
                                 </label>
                             </div>
                        </div>
                        <button type="submit" className="w-full bg-primary hover:bg-primaryHover text-white py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide mt-4">
                            Criar Usuário Local
                        </button>
                        {createMsg && <p className="text-center text-green-400 text-xs mt-2">{createMsg}</p>}
                    </form>
                 </div>
             )}

             {activeTab === 'list' && (
                <table className="w-full text-left border-collapse">
                    <thead>
                    <tr className="border-b border-border bg-white/5">
                        <th className="p-4 text-xs font-bold text-textMuted uppercase tracking-wider">Usuário</th>
                        <th className="p-4 text-xs font-bold text-textMuted uppercase tracking-wider">Status</th>
                        <th className="p-4 text-xs font-bold text-textMuted uppercase tracking-wider">Função</th>
                        <th className="p-4 text-xs font-bold text-textMuted uppercase tracking-wider text-right">Ações</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                    {loading ? (
                         <tr><td colSpan={4} className="p-8 text-center text-textMuted"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Carregando usuários...</td></tr>
                    ) : usersList.sort((a,b) => (a.status === 'pending' ? -1 : 1)).map(u => (
                        <tr key={u.id} className={`group transition-colors ${u.status === 'pending' ? 'bg-yellow-500/5 hover:bg-yellow-500/10' : 'hover:bg-white/5'}`}>
                            <td className="p-4">
                                <div className="flex items-center space-x-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${u.role === 'admin' ? 'bg-accent text-sidebar' : 'bg-border text-textMuted'}`}>
                                    {u.username.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="text-sm text-white font-medium flex items-center">
                                        {u.username} 
                                        {currentUser.id === u.id && <span className="text-[10px] text-textMuted ml-2 bg-white/10 px-1 rounded">(Você)</span>}
                                    </div>
                                    <div className="text-[10px] text-textMuted font-mono opacity-50">{u.id.substring(0,8)}...</div>
                                </div>
                                </div>
                            </td>
                            <td className="p-4">
                                {u.status === 'pending' && (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 animate-pulse">
                                        Pendente
                                    </span>
                                )}
                                {u.status === 'active' && (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide bg-green-500/20 text-green-500 border border-green-500/30">
                                        Ativo
                                    </span>
                                )}
                                {u.status === 'blocked' && (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide bg-red-500/20 text-red-500 border border-red-500/30">
                                        Bloqueado
                                    </span>
                                )}
                            </td>
                            <td className="p-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${u.role === 'admin' ? 'bg-accent/10 text-accent border border-accent/20' : 'bg-border/30 text-textMuted border border-border'}`}>
                                {u.role}
                                </span>
                            </td>
                            <td className="p-4 text-right space-x-2">
                                {u.status === 'pending' && (
                                    <button onClick={() => handleApprove(u.id)} className="inline-flex items-center px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-[10px] font-bold uppercase rounded transition-colors shadow-lg shadow-green-500/20">
                                        <Check className="w-3 h-3 mr-1" /> Aprovar
                                    </button>
                                )}
                                <button onClick={() => handleBlock(u.id)} className={`p-1.5 rounded transition-colors ${u.status === 'blocked' ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'hover:bg-white/10 text-textMuted hover:text-white'}`}>
                                <Ban className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleRoleToggle(u.id)} className="p-1.5 hover:bg-white/10 rounded text-textMuted hover:text-white transition-colors">
                                <Shield className={`w-4 h-4 ${u.role === 'admin' ? 'text-accent' : 'text-gray-500'}`} />
                                </button>
                                <button onClick={() => handleDelete(u.id)} className="p-1.5 hover:bg-red-500/20 rounded text-textMuted hover:text-red-400 transition-colors">
                                <Trash2 className="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
             )}
          </div>
       </div>
    </div>
  );
};

const SidebarPanel = ({ 
  state, 
  onChange, 
  onFileChange,
  onLogoChange,
  currentUser,
  onLogout,
  onOpenAdmin,
  onOpenSettings
}: { 
  state: AppState; 
  onChange: (key: keyof AppState, value: any) => void;
  onFileChange: (files: File[]) => void;
  onLogoChange: (file: File | null) => void;
  currentUser: User;
  onLogout: () => void;
  onOpenAdmin: () => void;
  onOpenSettings: () => void;
}) => {
  const [analyzing, setAnalyzing] = useState(false);
  const isAd = state.category === 'Ad Creative';
  const isInsta = state.category === 'Instagram Post';
  const isThumb = state.category === 'YouTube Thumbnail';
  const isBanner = state.category === 'Web Banner';

  const getRelevantFormats = () => {
    if (isThumb) return FORMATS.filter(f => f.value === '16:9');
    if (isInsta) return FORMATS.filter(f => f.value === '1:1' || f.value === '4:5' || f.value === '9:16');
    if (isBanner) return FORMATS.filter(f => f.value === '16:9' || f.value === '2:1');
    return FORMATS; 
  };

  const handleBrandAnalysis = async (files: File[]) => {
      if (!files || files.length === 0) return;
      setAnalyzing(true);
      try {
          const result = await analyzeBrandAssets(files);
          if (result.palette) onChange('colorPalette', result.palette);
          const matchedStyle = STYLES.find(s => s.value === result.style);
          if (matchedStyle) onChange('style', matchedStyle.value);
          else if (result.style) {
             const fuzzyMatch = STYLES.find(s => s.label.includes(result.style) || s.value.includes(result.style));
             if (fuzzyMatch) onChange('style', fuzzyMatch.value);
          }
          alert(`Análise Completa!\nEstilo Detectado: ${result.style}\nNicho Sugerido: ${result.nicheSuggestion}`);
      } catch (error: any) { 
          if(error.message.includes("CONFIGURAÇÃO NECESSÁRIA")) onOpenSettings();
          else alert(error.message); 
      } finally { setAnalyzing(false); }
  };

  return (
    <aside className="w-80 h-screen bg-sidebar border-r border-border overflow-y-auto fixed left-0 top-0 flex flex-col z-20">
      <div className="p-6 border-b border-border bg-sidebar/50 backdrop-blur-sm sticky top-0 z-10 flex justify-between items-center">
        <h2 className="text-xs font-bold text-accent uppercase tracking-widest flex items-center">
          <Layers className="w-3 h-3 mr-2" />
          Configuração Visual
        </h2>
        <button onClick={onOpenSettings} className="p-1.5 text-textMuted hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors group" title="Configurações (API Key)">
             <Settings className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
        </button>
      </div>

      <div className="p-6 space-y-8 flex-1">
        {/* User Info Section */}
        <div className="p-4 bg-surface rounded-xl border border-white/5 flex flex-col space-y-3">
           <div className="flex items-center space-x-3">
               <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold uppercase">
                  {currentUser.username.charAt(0)}
               </div>
               <div className="overflow-hidden">
                  <p className="text-sm font-bold text-white truncate">{currentUser.username}</p>
                  <p className="text-[10px] text-textMuted uppercase tracking-wider">{currentUser.role} • {currentUser.status === 'active' ? 'Ativo' : 'Pendente'}</p>
               </div>
           </div>
           
           <div className="flex space-x-2 pt-2 border-t border-white/5">
              {currentUser.role === 'admin' && (
                 <button onClick={onOpenAdmin} className="flex-1 py-1.5 bg-accent/10 hover:bg-accent/20 text-accent text-[10px] font-bold rounded flex items-center justify-center transition-colors">
                    <Shield className="w-3 h-3 mr-1" /> ADMIN
                 </button>
              )}
              <button onClick={onLogout} className="flex-1 py-1.5 bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-textMuted text-[10px] font-bold rounded flex items-center justify-center transition-colors">
                 <LogOut className="w-3 h-3 mr-1" /> SAIR
              </button>
           </div>
        </div>
        
        <div className="w-full h-px bg-border/50"></div>

        {/* Batch */}
        <div className="space-y-4">
          <div>
             <label className="flex items-center text-xs font-bold text-textMuted mb-2 uppercase tracking-wider">
               Variações
             </label>
             <div className="flex bg-surface rounded-lg p-1 border border-border">
                {[1, 2, 3].map((num) => (
                  <button
                    key={num}
                    onClick={() => onChange('modelCount', num)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${
                      state.modelCount === num
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-textMuted hover:text-white'
                    }`}
                  >
                    {num}x
                  </button>
                ))}
             </div>
          </div>
        </div>

        {/* Categories */}
        <div>
          <label className="flex items-center text-xs font-bold text-primary mb-3 uppercase tracking-wider">
            <Layout className="w-3 h-3 mr-2" />
            Tipo de Conteúdo
          </label>
          <div className="grid grid-cols-1 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => onChange('category', cat.value)}
                className={`text-left px-4 py-3 rounded-lg border transition-all flex items-center ${
                  state.category === cat.value
                    ? 'bg-primary/10 border-primary text-white'
                    : 'bg-surface border-border text-textMuted hover:border-gray-500'
                }`}
              >
                {cat.value === 'Instagram Post' && <Grid className={`w-4 h-4 mr-3 ${state.category === cat.value ? 'text-primary' : 'opacity-50'}`} />}
                {cat.value === 'Ad Creative' && <Megaphone className={`w-4 h-4 mr-3 ${state.category === cat.value ? 'text-primary' : 'opacity-50'}`} />}
                {cat.value === 'YouTube Thumbnail' && <Video className={`w-4 h-4 mr-3 ${state.category === cat.value ? 'text-primary' : 'opacity-50'}`} />}
                {cat.value === 'Web Banner' && <Monitor className={`w-4 h-4 mr-3 ${state.category === cat.value ? 'text-primary' : 'opacity-50'}`} />}
                <span className="text-sm font-medium">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* LOGO UPLOAD */}
        <div className="animate-fadeIn p-4 border border-dashed border-border rounded-xl bg-surface/30 hover:border-primary/50 transition-colors">
            <label className="flex justify-between items-center text-xs font-bold text-textMuted mb-2 uppercase tracking-wider cursor-pointer">
              <span className="flex items-center"><UploadCloud className="w-3 h-3 mr-2 text-accent" /> Inserir Logo (Opcional)</span>
            </label>
            {!state.logoImage ? (
                <label className="block w-full text-center py-4 cursor-pointer hover:bg-white/5 rounded transition-colors">
                    <span className="text-xs text-textMuted">Clique para enviar PNG/JPG</span>
                    <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => { if(e.target.files) { onLogoChange(e.target.files[0]); e.target.value = ''; } }} />
                </label>
            ) : (
                <div className="flex items-center justify-between bg-surface p-2 rounded-lg mt-2 border border-white/10">
                    <div className="flex items-center space-x-2 overflow-hidden">
                        <img src={URL.createObjectURL(state.logoImage)} className="w-8 h-8 object-contain rounded bg-white/5 p-1" alt="Logo" />
                        <span className="text-xs truncate max-w-[120px] text-white/80">{state.logoImage.name}</span>
                    </div>
                    <button onClick={() => onLogoChange(null)} className="text-red-400 hover:text-red-300 p-1.5 hover:bg-white/5 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}
        </div>

        {isAd && (
          <div className="animate-fadeIn">
            <label className="flex items-center text-xs font-bold text-textMuted mb-2 uppercase tracking-wider">
              <Zap className="w-3 h-3 mr-2 text-accent" />
              Objetivo
            </label>
            <select value={state.objective} onChange={(e) => onChange('objective', e.target.value)} className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary">
              {OBJECTIVES.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
            </select>
          </div>
        )}

        {!isBanner && (
          <div className="animate-fadeIn">
            <label className="flex items-center text-xs font-bold text-textMuted mb-2 uppercase tracking-wider">
              Categoria / Nicho
            </label>
            <select value={state.niche} onChange={(e) => onChange('niche', e.target.value)} className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary">
              {NICHES.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="flex items-center text-xs font-bold text-textMuted mb-2 uppercase tracking-wider">
              <Palette className="w-3 h-3 mr-2 text-accent" />
              Estilo
            </label>
            <select value={state.style} onChange={(e) => onChange('style', e.target.value)} className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary">
              {STYLES.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
            </select>
          </div>
          <div>
            <label className="flex items-center text-xs font-bold text-textMuted mb-2 uppercase tracking-wider">
              <Smile className="w-3 h-3 mr-2 text-accent" />
              Atmosfera (Mood)
            </label>
            <select value={state.mood} onChange={(e) => onChange('mood', e.target.value)} className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary">
              {MOODS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
            </select>
          </div>
          <div>
             <label className="flex items-center text-xs font-bold text-textMuted mb-2 uppercase tracking-wider">
               <ImageIcon className="w-3 h-3 mr-2 text-accent" />
               Proporção
             </label>
             <select value={state.format} onChange={(e) => onChange('format', e.target.value)} className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary">
                {getRelevantFormats().map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
              </select>
          </div>
        </div>

        <div>
           <label className="flex items-center text-xs font-bold text-textMuted mb-2 uppercase tracking-wider">
             <Ban className="w-3 h-3 mr-2 text-red-400" />
             O que evitar? (Opcional)
           </label>
           <input type="text" value={state.negativePrompt} onChange={(e) => onChange('negativePrompt', e.target.value)} placeholder="Ex: Pessoas, Texto extra, Cor verde..." className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary placeholder-gray-600 transition-all" />
        </div>

        <div className="pt-4 border-t border-border space-y-4">
          <div>
            <label className="text-xs font-bold text-textMuted mb-2 uppercase tracking-wider block">
              {isThumb ? 'Texto da Thumbnail (Curto)' : isAd ? 'Headline (Gancho)' : isBanner ? 'Título Principal' : 'Texto na Imagem (Opcional)'}
            </label>
            <input type="text" value={state.textOnImage} onChange={(e) => onChange('textOnImage', e.target.value)} placeholder={isThumb ? "EX: INCRÍVEL!" : "Digite o texto aqui..."} className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary placeholder-gray-600 transition-all" />
          </div>
          <div>
            <label className="text-xs font-bold text-textMuted mb-2 uppercase tracking-wider flex items-center">
                <AlignCenter className="w-3 h-3 mr-2 text-accent" />
                Posição do Texto
            </label>
            <select value={state.textPosition} onChange={(e) => onChange('textPosition', e.target.value)} className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary">
              {TEXT_POSITIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
            </select>
          </div>
          <div className="bg-surface/30 rounded-lg p-3 border border-border/50">
             <div className="flex items-center justify-between cursor-pointer" onClick={() => onChange('showCta', !state.showCta)}>
                 <label className="flex items-center text-xs font-bold text-textMuted uppercase tracking-wider cursor-pointer">
                    <MousePointerClick className="w-3 h-3 mr-2 text-accent" />
                    Inserir Botão / CTA?
                 </label>
                 <div className={`w-8 h-4 rounded-full flex items-center transition-colors px-0.5 ${state.showCta ? 'bg-primary' : 'bg-border'}`}>
                    <div className={`w-3 h-3 rounded-full bg-white transition-transform ${state.showCta ? 'translate-x-4' : 'translate-x-0'}`} />
                 </div>
             </div>
             {state.showCta && (
                <div className="mt-3 animate-fadeIn">
                  <input type="text" value={state.ctaText} onChange={(e) => onChange('ctaText', e.target.value)} placeholder="Texto do Botão (Ex: Saiba Mais)" className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-primary placeholder-gray-600 transition-all" />
                </div>
             )}
          </div>
        </div>

        <div>
           <div className="flex justify-between items-end mb-2">
               <label className="text-xs font-bold text-textMuted uppercase tracking-wider block">Cores / Identidade</label>
               <label className="cursor-pointer group flex items-center space-x-1 text-[10px] text-accent hover:text-white transition-colors">
                   {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ScanFace className="w-3 h-3" />}
                   <span>{analyzing ? "Analisando..." : "Analisar Marca"}</span>
                   <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => { if(e.target.files) { handleBrandAnalysis(Array.from(e.target.files)); e.target.value = ''; } }} disabled={analyzing} />
               </label>
           </div>
           <textarea value={state.colorPalette} onChange={(e) => onChange('colorPalette', e.target.value)} placeholder="Ex: Roxo neon e preto... (Ou clique em Analisar Marca)" rows={2} className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary resize-none placeholder-gray-600 transition-all" />
        </div>
      </div>
    </aside>
  );
};

// --- Main App ---
export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  
  // App Logic State
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [captionLoading, setCaptionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedCreative[]>([]);
  const [state, setState] = useState<AppState>({
    category: 'Instagram Post',
    modelCount: 1,
    objective: 'High CTR',
    niche: 'Technology',
    textOnImage: '', 
    textPosition: 'Balanced Composition',
    ctaText: '', 
    showCta: false, 
    colorPalette: '',
    description: '',
    negativePrompt: '',
    mood: 'Professional and Trustworthy',
    referenceImages: [],
    logoImage: null,
    style: 'Cinematic',
    format: '1:1'
  });

  // Check Session on Mount
  useEffect(() => {
    try {
      const session = getCurrentSession();
      if (session) {
        setCurrentUser(session);
      }
    } catch (e) {
      logoutUser();
    }
  }, []);

  // --- PERSISTENCE ---
  useEffect(() => {
    setIsCloudConnected(isFirebaseConfigured());

    if (!currentUser) return;
    
    const savedState = localStorage.getItem(`AZUL_STATE_${currentUser.id}`);
    if (savedState) {
        try {
            const parsed = JSON.parse(savedState);
            setState(prev => ({ ...prev, ...parsed, referenceImages: [], logoImage: null }));
        } catch(e) { console.error("Error loading state", e) }
    }
    
    const loadGallery = async () => {
        try {
            const items = await fetchCreatives(currentUser.id);
            setGeneratedImages(items);
        } catch(e) { console.error("Error loading gallery", e); }
    };
    loadGallery();

  }, [currentUser]);

  useEffect(() => {
     if (!currentUser) return;
     const stateToSave = { ...state, referenceImages: [], logoImage: null };
     localStorage.setItem(`AZUL_STATE_${currentUser.id}`, JSON.stringify(stateToSave));
  }, [state, currentUser]);

  const handleStateChange = (key: keyof AppState, value: any) => {
    setState(prev => ({ ...prev, [key]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setState(prev => ({ ...prev, referenceImages: [...prev.referenceImages, ...Array.from(e.target.files as FileList)] }));
      e.target.value = '';
    }
  };

  const removeReference = (index: number) => {
    setState(prev => ({ ...prev, referenceImages: prev.referenceImages.filter((_, i) => i !== index) }));
  };

  const handleDownload = (url: string, id: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `azul-${state.category.replace(/\s+/g, '-').toLowerCase()}-${id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const urlToFile = async (url: string, filename: string, mimeType: string) => {
      const res = await fetch(url);
      const buf = await res.arrayBuffer();
      return new File([buf], filename, { type: mimeType });
  };

  const handleRemix = async (creative: GeneratedCreative) => {
     setLoading(true);
     try {
         const file = await urlToFile(creative.url, `remix_base_${creative.id}.jpg`, 'image/jpeg');
         setState(prev => ({ ...prev, ...creative.settings, referenceImages: [file] }));
         window.scrollTo({ top: 0, behavior: 'smooth' });
     } catch (e) { console.error("Failed to prepare remix", e); setError("Erro ao preparar imagem para edição."); } finally { setLoading(false); }
  };

  const handleMagicPrompt = async () => {
    if (!state.description) return;
    setMagicLoading(true);
    setError(null); 
    try {
        const enhanced = await enhancePrompt(state.description, state.category, state.style);
        handleStateChange('description', enhanced);
    } catch (e: any) { 
        console.error(e); 
        // Se o erro for de configuração, abre o modal
        if (e.message.includes("CONFIGURAÇÃO NECESSÁRIA")) {
             setShowSettings(true);
             setError("Por favor, configure sua chave de API para continuar.");
        } else {
             setError("Erro ao melhorar prompt. Verifique se a API Key está válida."); 
        }
    } finally { setMagicLoading(false); }
  };

  const handleGenerateCaption = async (creative: GeneratedCreative) => {
     if (creative.caption) return; 
     setCaptionLoading(creative.id);
     try {
         const caption = await generateSocialCaption(creative.url, creative.settings.niche, creative.settings.objective);
         setGeneratedImages(prev => prev.map(img => img.id === creative.id ? { ...img, caption } : img));
         if (currentUser) {
            updateCaptionInDb(creative.id, caption, currentUser.id);
         }
     } catch (e: any) { 
         console.error(e); 
         if (e.message.includes("CONFIGURAÇÃO NECESSÁRIA")) setShowSettings(true);
         else alert("Erro ao gerar legenda."); 
     } finally { setCaptionLoading(null); }
  };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); alert("Copiado!"); };

  const handleGenerate = async () => {
    if (!state.description) { setError("Por favor, descreva o conceito visual para iniciar."); return; }
    setError(null);
    setLoading(true);
    try {
      const images = await generateCreatives(state);
      const currentSettings = {
        category: state.category,
        description: state.description,
        textOnImage: state.textOnImage,
        ctaText: state.ctaText,
        style: state.style,
        format: state.format,
        objective: state.objective,
        niche: state.niche,
        colorPalette: state.colorPalette
      };
      
      const newCreatives: GeneratedCreative[] = images.map(url => ({
        id: Math.random().toString(36).substr(2, 9),
        url,
        timestamp: Date.now(),
        settings: currentSettings
      }));

      setGeneratedImages(prev => [...newCreatives, ...prev]);

      if (currentUser) {
          for (const creative of newCreatives) {
              await saveCreative(currentUser.id, creative);
          }
          const syncedItems = await fetchCreatives(currentUser.id);
          setGeneratedImages(syncedItems);
      }

    } catch (err: any) { 
        if (err.message.includes("CONFIGURAÇÃO NECESSÁRIA")) {
            setShowSettings(true);
            setError("Chave de API necessária para gerar imagens.");
        } else {
            setError(err.message || "Erro desconhecido na síntese visual."); 
        }
    } finally { setLoading(false); }
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setGeneratedImages([]);
  };

  const handleTestConnection = async () => {
    if (!isCloudConnected) {
        alert("Modo Local: Seus dados estão sendo salvos apenas no seu navegador.");
        return;
    }
    const result = await checkDatabaseConnection();
    alert(result);
  };

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={setCurrentUser} />;
  }

  return (
    <div className="flex min-h-screen bg-background text-textMain selection:bg-primary selection:text-white font-sans">
      {/* Modals */}
      {showAdminPanel && currentUser.role === 'admin' && (
        <AdminPanel currentUser={currentUser} onClose={() => setShowAdminPanel(false)} />
      )}
      
      {showSettings && (
          <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {/* Sidebar */}
      <SidebarPanel 
        state={state} 
        onChange={handleStateChange}
        onFileChange={(files) => setState(prev => ({ ...prev, referenceImages: [...prev.referenceImages, ...files] }))}
        onLogoChange={(file) => setState(prev => ({ ...prev, logoImage: file }))}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAdmin={() => setShowAdminPanel(true)}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Main Content */}
      <main className="ml-80 flex-1 p-10 relative">
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center space-x-4 select-none">
             <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
               <Sparkles className="text-white w-6 h-6" />
             </div>
             <div>
               <h1 className="text-3xl font-bold tracking-tight text-white leading-none">AZUL</h1>
               <span className="text-[10px] font-semibold tracking-[0.2em] text-accent uppercase">Creative IA</span>
             </div>
          </div>
          <div className="flex items-center space-x-6">
             <button onClick={() => { if(confirm("Deseja limpar toda a galeria e o histórico?")) { setGeneratedImages([]); localStorage.removeItem(`AZUL_GALLERY_${currentUser.id}`); } }} className="group flex items-center space-x-2 text-xs font-medium text-textMuted hover:text-white transition-colors">
               <RotateCcw className="w-3.5 h-3.5 group-hover:-rotate-180 transition-transform duration-500" /> <span>Limpar Tela</span>
             </button>
             
             <button 
                onClick={handleTestConnection}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all hover:scale-105 active:scale-95 cursor-pointer ${isCloudConnected ? 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20' : 'bg-surface border-white/5 text-textMuted hover:bg-white/5'}`} 
                title="Clique para testar a conexão com o banco de dados"
             >
                {isCloudConnected ? <Flame className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
                <span className="text-[10px] font-bold tracking-widest">{isCloudConnected ? "FIREBASE ON" : "MODO LOCAL"}</span>
             </button>

             <div className="flex items-center space-x-2 px-3 py-1.5 bg-surface/50 rounded-full border border-white/5">
               <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-yellow-500 animate-ping' : 'bg-emerald-500'} shadow-[0_0_8px_rgba(16,185,129,0.5)]`}></div>
               <span className="text-[10px] font-bold tracking-widest text-textMuted">SISTEMA {loading ? 'OCUPADO' : 'PRONTO'}</span>
             </div>
          </div>
        </header>

        {/* Input Canvas */}
        <div className="bg-surface/30 border border-white/5 rounded-2xl p-8 mb-12 backdrop-blur-md shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none group-hover:bg-primary/10 transition-colors duration-1000"></div>
            <div className="flex flex-col space-y-8">
               <div>
                 <div className="flex justify-between items-end mb-3">
                    <label className="text-xs font-bold text-textMuted uppercase tracking-wider flex items-center">
                      <ImageIcon className="w-3 h-3 mr-2" />
                      {state.referenceImages.length > 0 ? "Imagem Base (Edição/Referência)" : "Referências Visuais"}
                      <span className="ml-2 px-1.5 py-0.5 bg-white/5 rounded text-[9px]">{state.referenceImages.length}/5</span>
                    </label>
                    {state.referenceImages.length > 0 && (
                      <span onClick={() => setState(prev => ({...prev, referenceImages: []}))} className="text-[10px] text-red-400 cursor-pointer hover:text-red-300 transition-colors">Remover todas</span>
                    )}
                 </div>
                 <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
                    <div className="flex-shrink-0">
                      <label className="w-28 h-28 rounded-xl border border-dashed border-border bg-background/50 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group/upload relative overflow-hidden">
                          <div className="p-2 rounded-full bg-surface mb-2 group-hover/upload:scale-110 transition-transform">
                             <Sparkles className="w-4 h-4 text-textMuted group-hover/upload:text-primary" />
                          </div>
                          <span className="text-[10px] text-textMuted font-medium group-hover/upload:text-primary transition-colors">Adicionar Imagem</span>
                          <input type="file" className="hidden" multiple accept="image/*" onChange={handleFileChange} />
                      </label>
                    </div>
                    {state.referenceImages.map((file, idx) => (
                      <div key={idx} className="relative group/img w-28 h-28 flex-shrink-0">
                        <img src={URL.createObjectURL(file)} alt="Ref" className="w-full h-full object-cover rounded-xl border border-border shadow-lg" />
                        <button onClick={() => removeReference(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover/img:opacity-100 transition-opacity shadow-md transform scale-90 hover:scale-100"><Zap className="w-3 h-3" /></button>
                      </div>
                    ))}
                 </div>
               </div>

               <div className="relative">
                  <div className="absolute top-10 left-0 pointer-events-none"><span className="text-primary font-serif italic text-2xl opacity-20">"</span></div>
                  <textarea value={state.description} onChange={(e) => handleStateChange('description', e.target.value)} placeholder="Descreva sua visão aqui... Ex: Cena cyberpunk noturna com iluminação neon azul e rosa, foco no produto central flutuando." className="w-full h-36 bg-transparent text-lg font-light text-white placeholder-gray-600 focus:outline-none resize-none leading-relaxed px-6 py-2 border-l-2 border-transparent focus:border-primary transition-colors" />
                  <div className="absolute bottom-3 right-3 flex items-center space-x-2">
                     <button onClick={handleMagicPrompt} disabled={magicLoading || !state.description} className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${magicLoading ? 'bg-primary/50 text-white cursor-wait' : 'bg-primary/20 text-primary hover:bg-primary hover:text-white'} ${!state.description ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {magicLoading ? (<Sparkles className="w-3 h-3 animate-spin" />) : (<Wand2 className="w-3 h-3" />)}
                        <span>{magicLoading ? 'Melhorando...' : 'Prompt Mágico'}</span>
                     </button>
                     <div className="text-[10px] text-textMuted uppercase font-bold tracking-widest bg-background/30 px-2 py-1.5 rounded backdrop-blur border border-white/5">Prompt IA</div>
                  </div>
               </div>
            </div>
            {error && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-sm flex items-start animate-fadeIn">
                 <AlertCircle className="w-5 h-5 mr-3 text-red-500 flex-shrink-0 mt-0.5" />
                 <div><p className="font-bold mb-1">Erro na Geração</p><p className="opacity-80">{error}</p></div>
              </div>
            )}
            <div className="mt-8 flex justify-end border-t border-white/5 pt-6">
                <button onClick={handleGenerate} disabled={loading} className={`px-8 py-3.5 rounded-lg font-bold text-xs uppercase tracking-widest text-white transition-all duration-300 transform flex items-center shadow-xl ${loading ? 'bg-surface cursor-wait border border-border text-textMuted' : 'bg-primary hover:bg-primaryHover hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] hover:-translate-y-0.5'}`}>
                   {loading ? (<><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>SINTETIZANDO...</>) : (<>GERAR VISUAL <Sparkles className="w-4 h-4 ml-2" /></>)}
                </button>
            </div>
        </div>

        {/* Results Grid */}
        <div className="animate-fadeIn pb-20">
           <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center"><span className="w-1.5 h-6 bg-accent rounded-full mr-3"></span>Galeria Gerada</h2>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {generatedImages.length === 0 && !loading && (
                <div className="col-span-full py-24 flex flex-col items-center justify-center text-border border border-dashed border-border rounded-2xl bg-surface/10">
                   <div className="p-4 bg-surface rounded-full mb-4"><ImageIcon className="w-8 h-8 opacity-20 text-white" /></div>
                   <p className="text-textMuted text-sm font-medium">Aguardando comando criativo...</p>
                </div>
              )}
              {generatedImages.map((img) => (
                <div key={img.id} className="flex flex-col bg-surface border border-white/5 rounded-2xl overflow-hidden shadow-xl hover:border-primary/50 transition-all duration-500 hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)] group/card">
                    <div className="relative group overflow-hidden">
                        <img src={img.url} alt="Generated" className="w-full h-auto transition-transform duration-700 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                           <div className="flex items-center space-x-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                              <button onClick={() => handleRemix(img)} className="bg-white/10 backdrop-blur-md text-white border border-white/20 p-2.5 rounded-lg hover:bg-primary hover:border-primary transition-all flex items-center justify-center" title="Editar Texto / Remixar"><Edit3 className="w-4 h-4" /></button>
                              <button onClick={() => handleDownload(img.url, img.id)} className="flex-1 bg-white text-black py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-100 transition-colors flex items-center justify-center" title="Baixar"><Download className="w-3 h-3 mr-2" /> Baixar</button>
                           </div>
                        </div>
                    </div>
                    <div className="p-4 bg-surface/50 border-t border-white/5">
                       <div className="flex justify-between items-center mb-3">
                         <div className="flex flex-col">
                            <span className="text-[10px] text-primary font-bold uppercase tracking-widest">{img.settings.category || 'Visual'}</span>
                            <span className="text-[9px] text-gray-400">{STYLES.find(s => s.value === img.settings.style)?.label || img.settings.style}</span>
                         </div>
                         <button onClick={() => handleGenerateCaption(img)} disabled={!!captionLoading} className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border border-white/10 ${img.caption ? 'bg-primary/20 text-primary border-primary/30' : 'bg-surface hover:bg-white/5 text-textMuted hover:text-white'}`}>
                            {captionLoading === img.id ? (<Loader2 className="w-3 h-3 animate-spin" />) : (<MessageSquare className="w-3 h-3" />)}
                            <span>{img.caption ? "Ver Legenda" : "Gerar Legenda"}</span>
                         </button>
                       </div>
                       {img.caption && (
                           <div className="bg-background/50 rounded-lg p-3 text-xs text-gray-300 border border-white/5 animate-fadeIn">
                               <p className="whitespace-pre-line line-clamp-4 hover:line-clamp-none transition-all">{img.caption}</p>
                               <button onClick={() => copyToClipboard(img.caption!)} className="mt-2 w-full flex items-center justify-center py-1.5 bg-white/5 hover:bg-white/10 rounded text-[9px] font-medium text-textMuted hover:text-white transition-colors uppercase tracking-wider"><Copy className="w-3 h-3 mr-1.5" /> Copiar Texto</button>
                           </div>
                       )}
                    </div>
                </div>
              ))}
           </div>
        </div>
      </main>
    </div>
  );
}
