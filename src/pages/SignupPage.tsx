import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

export function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 유효성 검사
    if (password.length < 8) {
      toast.error('비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (!nickname.trim()) {
      toast.error('닉네임을 입력해주세요.');
      return;
    }

    if (bio.length > 200) {
      toast.error('자기소개는 200자 이내로 입력해주세요.');
      return;
    }

    setIsLoading(true);

    try {
      // 회원가입 (이메일/닉네임 중복은 Supabase가 자동으로 체크)
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nickname,
            bio: bio || null,
          },
        },
      });

      if (error) {
        console.error('회원가입 에러:', error);
        
        if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          toast.error('이미 가입된 이메일입니다.');
        } else if (error.message.includes('rate limit')) {
          toast.error('이메일 전송 제한 초과. 잠시 후 다시 시도해주세요.');
        } else if (error.message.includes('email') && !error.message.includes('Invalid')) {
          toast.error('이메일 인증에 문제가 있습니다. 잠시 후 다시 시도해주세요.');
        } else if (error.message.includes('duplicate') || error.message.includes('unique')) {
          toast.error('이미 사용 중인 이메일 또는 닉네임입니다.');
        } else {
          toast.error('회원가입 오류가 발생했습니다. 다시 시도해주세요.');
        }
        setIsLoading(false);
        return;
      }

      // 이메일 확인이 필요한 경우와 필요하지 않은 경우 모두 처리
      toast.success('회원가입이 완료되었습니다!', {
        duration: 2000,
      });
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (error) {
      console.error('회원가입 오류:', error);
      toast.error('회원가입 중 오류가 발생했습니다.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-8 text-center">회원가입</h1>
        
        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              이메일 주소
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="example@email.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="8자 이상 입력해주세요"
              required
            />
            <p className="text-xs text-gray-500 mt-1">8자 이상 입력해주세요</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
              비밀번호 확인
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="비밀번호를 다시 입력해주세요"
              required
            />
          </div>

          <div>
            <label htmlFor="nickname" className="block text-sm font-medium mb-2">
              닉네임
            </label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="사용하실 닉네임을 입력해주세요"
              required
            />
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium mb-2">
              자기소개 <span className="text-gray-400 font-normal">(선택)</span>
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="자기소개를 입력해주세요"
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-1 text-right">
              {bio.length} / 200자
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? '처리 중...' : '회원가입'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="text-blue-600 hover:underline font-medium">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
