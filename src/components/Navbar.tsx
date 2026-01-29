import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/SearchBar';

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center gap-6">
        <Link to="/" className="text-2xl font-bold flex-shrink-0">
          myblog
        </Link>

        {/* 검색창 */}
        <SearchBar />

        <div className="flex items-center gap-4 flex-shrink-0">
          {user ? (
            <>
              <Link to="/write">
                <Button variant="default">글쓰기</Button>
              </Link>
              <Link to="/mypage">
                <div className="flex items-center gap-2 hover:opacity-80 transition">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium overflow-hidden">
                    {profile?.profile_image ? (
                      <img
                        src={profile.profile_image}
                        alt={profile.nickname}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{profile?.nickname ? profile.nickname[0].toUpperCase() : 'U'}</span>
                    )}
                  </div>
                  <span className="text-sm font-medium">
                    {profile?.nickname || user.email}
                  </span>
                </div>
              </Link>
              <Button variant="outline" onClick={handleLogout}>
                로그아웃
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="outline">로그인</Button>
              </Link>
              <Link to="/signup">
                <Button variant="default">회원가입</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
