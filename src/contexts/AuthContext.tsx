import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type User = Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'];

interface Profile {
  id: string;
  email: string;
  nickname: string;
  bio: string | null;
  email_public: boolean;
  profile_image: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 초기 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 인증 상태 변경 리스너
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, nickname, bio, email_public, profile_image, created_at, updated_at')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('프로필 로드 에러:', error.message, error);
        
        // 프로필이 없는 경우 자동 생성 시도
        if (error.code === 'PGRST116') {
          const { data: userData } = await supabase.auth.getUser();
          if (userData.user) {
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: userData.user.id,
                email: userData.user.email || '',
                nickname: userData.user.user_metadata?.nickname || userData.user.email?.split('@')[0] || '사용자',
                bio: userData.user.user_metadata?.bio || null,
                email_public: false,
              });
            
            if (!insertError) {
              // 프로필 생성 후 다시 로드
              loadProfile(userId);
              return;
            }
          }
        }
        
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('프로필 로드 중 오류:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
