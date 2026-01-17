import React, { useState, useEffect } from 'react';
import { AppState, GeneratedCreative, User } from './types';
import { generateCreatives, enhancePrompt, analyzeBrandAssets, generateSocialCaption } from './services/geminiService';
import { loginUser, registerUser, logoutUser, getCurrentSession, getUsers, deleteUser, toggleUserRole, approveUser, createUserByAdmin, blockUser } from './services/supabaseService';
import { saveCreative, fetchCreatives, updateCaptionInDb } from './services/dataService'; 
import { isSupabaseConfigured } from './lib/supabaseClient'; 
import { Layout, Sidebar, Search, Zap, Image as ImageIcon, CheckCircle, RotateCcw, Download, Sparkles, Layers, Palette, AlertCircle, Key, Edit3, Grid, Monitor, Video, Megaphone, UploadCloud, Trash2, Wand2, ScanFace, Loader2, MousePointerClick, Lock, Unlock, Ban, MessageSquare, Copy, Smile, AlignCenter, User as UserIcon, LogOut, Shield, ShieldAlert, Users, UserPlus, Check, XCircle, Settings, X, Cloud, CloudOff, Database, Eye, EyeOff } from 'lucide-react';
import { STYLES, FORMATS, OBJECTIVES, NICHES, CATEGORIES, MOODS, TEXT_POSITIONS } from './constants';

// --- Login Screen Component ---
const LoginScreen = ({ onLoginSuccess }: { onLoginSuccess: (user: User) => void }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[128px] pointer-events-none" />

      <div className="w-full max-w-md bg-surface/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
           <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
             <Sparkles className="text-white w-6 h-6" />
           </div>
           <h1 className="text-2xl font-bold text-white tracking-tight">Azul Creative IA</h1>
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

// --- Admin Panel Component ---
const AdminPanel = ({ currentUser, onClose }: { currentUser: User; onClose: () => void }) => {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [loading, setLoading] = useState(false);
  
  // Create Form State
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

  useEffect(() => {
      refreshList();
  }, []);

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
          {/* Header */}
          <div className="p-6 border-b border-border flex justify-between items-center bg-sidebar">
             <div className="flex items-center space-x-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                   <ShieldAlert className="w-6 h-6 text-accent" />
                </div>
                <div>
                   <h2 className="text-xl font-bold text-white">Painel Administrativo</h2>
                   <p className="text-xs text-textMuted uppercase tracking-wider">Gestão de Acessos</p>
                </div>
             </div>
             <div className="flex items-center space-x-4">
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

          {/* Stats Bar */}
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

          {/* Content */}
          <div className="flex-1 overflow-auto p-6 bg-surface/50">
             
             {activeTab === 'create' && (
                 <div className="max-w-md mx-auto mt-10 p-8 bg-sidebar border border-border rounded-2xl shadow-lg">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center"><UserPlus className="w-5 h-5 mr-2 text-accent" /> Cadastrar Usuário</h3>
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
                            Criar Usuário Aprovado
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
                                    <div className="text-[10px] text-textMuted font-mono opacity-50">{u.id}</div>
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
                                    <button 
                                        onClick={() => handleApprove(u.id)}
                                        className="inline-flex items-center px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-[10px] font-bold uppercase rounded transition-colors shadow-lg shadow-green-500/20"
                                        title="Aprovar Usuário"
                                    >
                                        <Check className="w-3 h-3 mr-1" /> Aprovar
                                    </button>
                                )}

                                <button 
                                onClick={() => handleBlock(u.id)}
                                className={`p-1.5 rounded transition-colors ${u.status === 'blocked' ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'hover:bg-white/10 text-textMuted hover:text-white'}`}
                                title={u.status === 'blocked' ? "Desbloquear" : "Bloquear"}
                                >
                                <Ban className="w-4 h-4" />
                                </button>

                                <button 
                                onClick={() => handleRoleToggle(u.id)}
                                className="p-1.5 hover:bg-white/10 rounded text-textMuted hover:text-white transition-colors"
                                title={u.role === 'admin' ? "Rebaixar para Usuário" : "Promover a Admin"}
                                >
                                <Shield className={`w-4 h-4 ${u.role === 'admin' ? 'text-accent' : 'text-gray-500'}`} />
                                </button>
                                
                                <button 
                                onClick={() => handleDelete(u.id)}
                                className="p-1.5 hover:bg-red-500/20 rounded text-textMuted hover:text-red-400 transition-colors"
                                title="Excluir Usuário"
                                >
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

// --- Sidebar Component (Modified) ---
const SidebarPanel = ({ 
  state, 
  onChange, 
  onFileChange,
  onLogoChange,
  currentUser,
  onLogout,
  onOpenAdmin,
}: { 
  state: AppState; 
  onChange: (key: keyof AppState, value: any) => void;
  onFileChange: (files: File[]) => void;
  onLogoChange: (file: File | null) => void;
  currentUser: User;
  onLogout: () => void;
  onOpenAdmin: () => void;
}) => {
  const [analyzing, setAnalyzing] = useState(false);

  // Check if system key exists
  const hasSystemKey = !!import.meta.env.VITE_GEMINI_API_KEY && import.meta.env.VITE_GEMINI_API_KEY.length > 0 && import.meta.env.VITE_GEMINI_API_KEY !== 'undefined';

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
      } catch (error: any) { console.error(error); alert(error.message); } finally { setAnalyzing(false); }
  };

  return (
    <aside className="w-80 h-screen bg-sidebar border-r border-border overflow-y-auto fixed left-0 top-0 flex flex-col z-20">
      <div className="p-6 border-b border-border bg-sidebar/50 backdrop-blur-sm sticky top-0 z-10">
        <h2 className="text-xs font-bold text-accent uppercase tracking-widest mb-1 flex items-center">
          <Layers className="w-3 h-3 mr-2" />
          Configuração Visual
        </h2>
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
        
        {!hasSystemKey && (
          <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20 space-y-2">
            <p className="text-[10px] text-red-300 font-bold flex items-center">
                <AlertCircle className="w-3 h-3 mr-1.5" />
                Erro de Configuração
            </p>
            <p className="text-[9px] text-red-300 opacity-80 leading-tight">
                A variável de ambiente VITE_GEMINI_API_KEY não foi detectada. O sistema não funcionará sem ela.
            </p>
          </div>
        )}

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
                {cat.value === 'Instagram Post' && <Grid className={`w-4 h-4 mr-
