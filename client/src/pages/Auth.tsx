import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Eye, EyeOff, Upload, Building2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Auth: React.FC = () => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');

  const [companyName, setCompanyName] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [signupPw, setSignupPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await signIn(loginId, password);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    navigate('/dashboard');
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!companyName || !name || !email || !signupPw) { setError('Please fill in all required fields.'); return; }
    if (signupPw !== confirmPw) { setError('Passwords do not match.'); return; }
    if (signupPw.length < 8) { setError('Password must be at least 8 characters.'); return; }

    setLoading(true);
    try {
      const { token } = await api.signUp({ companyName, name, email, phone, password: signupPw, logo: companyLogo });
      localStorage.setItem('hrms_token', token);
      await signIn(email, signupPw);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError((err as Error).message);
    }
    setLoading(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setCompanyLogo(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <h1 className="text-center text-white font-light tracking-[0.3em] text-lg mb-10 font-mono">
          Human Resource Management System
        </h1>

        <div className="flex flex-col md:flex-row gap-8 justify-center items-start">
          {/* Sign In Panel */}
          <div className={`relative transition-all duration-300 ${mode === 'signup' ? 'opacity-40 scale-95 pointer-events-none' : 'opacity-100'} w-full max-w-sm`}>
            <div className="border border-white/20 rounded-sm p-6 bg-[#1a1a2e]">
              <p className="text-white/60 text-xs mb-4 font-mono tracking-widest">Sign in Page</p>
              <div className="bg-[#2a2a3e] rounded text-center py-3 mb-6">
                <div className="flex items-center justify-center gap-2 text-white/60">
                  <Building2 className="h-4 w-4" />
                  <span className="text-sm font-mono">Dayflow HRMS</span>
                </div>
              </div>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label className="text-white/70 text-sm font-mono">Login Id/Email :</Label>
                  <Input value={loginId} onChange={e => setLoginId(e.target.value)}
                    className="mt-1 bg-transparent border-0 border-b border-white/30 rounded-none text-white focus-visible:ring-0 focus-visible:border-purple-400 px-0" />
                </div>
                <div>
                  <Label className="text-white/70 text-sm font-mono">Password :</Label>
                  <div className="relative">
                    <Input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                      className="mt-1 bg-transparent border-0 border-b border-white/30 rounded-none text-white focus-visible:ring-0 focus-visible:border-purple-400 px-0 pr-8" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-0 bottom-2 text-white/40 hover:text-white/70">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {error && mode === 'signin' && (
                  <div className="flex items-center gap-2 text-red-400 text-xs"><AlertCircle className="h-3 w-3" />{error}</div>
                )}
                <Button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-mono tracking-widest text-xs mt-2">
                  {loading ? 'SIGNING IN...' : 'SIGN IN'}
                </Button>
                <p className="text-center text-white/50 text-xs font-mono">
                  Don't have an Account?{' '}
                  <button type="button" onClick={() => { setMode('signup'); setError(''); }} className="text-purple-400 hover:text-purple-300 underline">Sign Up</button>
                </p>
              </form>
            </div>
            <div className="mt-3 border border-white/10 rounded-sm p-3 bg-[#1a1a2e]/50 text-xs text-white/40 font-mono">
              <p className="text-white/60 mb-1">Demo credentials:</p>
              <p>Admin: admin@odooindia.com / Admin@123</p>
              <p>Employee: john.doe@odooindia.com / Pass@1234</p>
            </div>
          </div>

          {/* Sign Up Panel */}
          <div className={`relative transition-all duration-300 ${mode === 'signin' ? 'opacity-40 scale-95 pointer-events-none' : 'opacity-100'} w-full max-w-sm`}>
            <div className="border border-white/20 rounded-sm p-6 bg-[#1a1a2e]">
              <p className="text-white/60 text-xs mb-4 font-mono tracking-widest">Sign Up Page</p>
              <div className="bg-[#2a2a3e] rounded text-center py-3 mb-5">
                <div className="flex items-center justify-center gap-2 text-white/60">
                  <Building2 className="h-4 w-4" /><span className="text-sm font-mono">App/Web Logo</span>
                </div>
              </div>
              <form onSubmit={handleSignUp} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label className="text-white/70 text-xs font-mono">Company Name :-</Label>
                    <Input value={companyName} onChange={e => setCompanyName(e.target.value)}
                      className="mt-1 bg-transparent border-0 border-b border-white/30 rounded-none text-white text-sm focus-visible:ring-0 focus-visible:border-purple-400 px-0 h-7" />
                  </div>
                  <label className="cursor-pointer mt-4 p-2 border border-white/20 rounded hover:border-purple-400 transition-colors">
                    <Upload className="h-4 w-4 text-white/60" />
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                </div>
                {[
                  { label: 'Name :-', value: name, set: setName, type: 'text' },
                  { label: 'Email :-', value: email, set: setEmail, type: 'email' },
                  { label: 'Phone :-', value: phone, set: setPhone, type: 'tel' },
                ].map(({ label, value, set, type }) => (
                  <div key={label}>
                    <Label className="text-white/70 text-xs font-mono">{label}</Label>
                    <Input type={type} value={value} onChange={e => set(e.target.value)}
                      className="mt-1 bg-transparent border-0 border-b border-white/30 rounded-none text-white text-sm focus-visible:ring-0 focus-visible:border-purple-400 px-0 h-7" />
                  </div>
                ))}
                <div>
                  <Label className="text-white/70 text-xs font-mono">Password :-</Label>
                  <div className="relative">
                    <Input type={showPw ? 'text' : 'password'} value={signupPw} onChange={e => setSignupPw(e.target.value)}
                      className="mt-1 bg-transparent border-0 border-b border-white/30 rounded-none text-white text-sm focus-visible:ring-0 focus-visible:border-purple-400 px-0 h-7 pr-8" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-0 bottom-1 text-white/40">
                      {showPw ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-white/70 text-xs font-mono">Confirm Password :-</Label>
                  <div className="relative">
                    <Input type={showConfirmPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                      className="mt-1 bg-transparent border-0 border-b border-white/30 rounded-none text-white text-sm focus-visible:ring-0 focus-visible:border-purple-400 px-0 h-7 pr-8" />
                    <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-0 bottom-1 text-white/40">
                      {showConfirmPw ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
                {error && mode === 'signup' && (
                  <div className="flex items-center gap-2 text-red-400 text-xs"><AlertCircle className="h-3 w-3" />{error}</div>
                )}
                <Button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-mono tracking-widest text-xs mt-2">
                  {loading ? 'CREATING...' : 'Sign Up'}
                </Button>
                <p className="text-center text-white/50 text-xs font-mono">
                  Already have an account?{' '}
                  <button type="button" onClick={() => { setMode('signin'); setError(''); }} className="text-purple-400 hover:text-purple-300 underline">Sign In</button>
                </p>
              </form>
            </div>
            <div className="mt-3 border border-yellow-500/30 rounded-sm p-3 bg-[#1a1a2e]/50 text-xs text-white/50 font-mono">
              <p className="text-yellow-400/80 mb-1">Note:</p>
              <p>• Normal users cannot self-register.</p>
              <p>• Only Admin/HR can create employees.</p>
              <p>• System auto-generates Login ID & password.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
