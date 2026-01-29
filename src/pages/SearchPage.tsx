import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Search, FileText, User, Eye, Heart, MessageCircle } from 'lucide-react';
import { PostCardSkeleton } from '@/components/PostCardSkeleton';

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author_id: string;
  views_count: number;
  tags: string[];
}

interface PostWithStats extends Post {
  likes_count: number;
  comments_count: number;
  author_nickname: string;
}

interface Profile {
  id: string;
  nickname: string;
  bio: string | null;
  email: string;
}

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [posts, setPosts] = useState<PostWithStats[]>([]);
  const [authors, setAuthors] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'authors'>('posts');

  useEffect(() => {
    if (query) {
      searchContent();
    }
  }, [query]);

  const searchContent = async () => {
    setLoading(true);

    try {
      // 게시글 검색 (제목 또는 내용에 검색어 포함)
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (postsError) throw postsError;

      // 작성자 검색 (닉네임에 검색어 포함)
      const { data: authorsData, error: authorsError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('nickname', `%${query}%`)
        .limit(20);

      if (authorsError) throw authorsError;

      setAuthors(authorsData || []);

      if (postsData && postsData.length > 0) {
        const postIds = postsData.map((post) => post.id);
        const authorIds = postsData.map((post) => post.author_id);

        // 통계 및 작성자 정보 가져오기
        const [likesResult, commentsResult, profilesResult] = await Promise.all([
          supabase
            .from('post_likes')
            .select('post_id')
            .in('post_id', postIds),
          supabase
            .from('comments')
            .select('post_id')
            .in('post_id', postIds),
          supabase
            .from('profiles')
            .select('id, nickname')
            .in('id', authorIds),
        ]);

        const likesCount: { [key: string]: number } = {};
        if (likesResult.data) {
          likesResult.data.forEach((like) => {
            likesCount[like.post_id] = (likesCount[like.post_id] || 0) + 1;
          });
        }

        const commentsCount: { [key: string]: number } = {};
        if (commentsResult.data) {
          commentsResult.data.forEach((comment) => {
            commentsCount[comment.post_id] = (commentsCount[comment.post_id] || 0) + 1;
          });
        }

        const profilesMap: { [key: string]: string } = {};
        if (profilesResult.data) {
          profilesResult.data.forEach((profile) => {
            profilesMap[profile.id] = profile.nickname;
          });
        }

        const postsWithStats: PostWithStats[] = postsData.map((post) => ({
          ...post,
          likes_count: likesCount[post.id] || 0,
          comments_count: commentsCount[post.id] || 0,
          author_nickname: profilesMap[post.author_id] || '알 수 없음',
        }));

        setPosts(postsWithStats);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('검색 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 검색어 하이라이트 함수
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={index} className="bg-yellow-200 px-0.5">
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* 검색 헤더 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Search className="w-6 h-6 text-gray-400" />
            <h1 className="text-3xl font-bold">
              "{query}" 검색 결과
            </h1>
          </div>
          <p className="text-gray-600">
            게시글 {posts.length}개 · 작성자 {authors.length}명
          </p>
        </div>

        {/* 탭 메뉴 */}
        <div className="border-b mb-6">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('posts')}
              className={`pb-3 font-semibold transition flex items-center gap-2 ${
                activeTab === 'posts'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span>게시글 ({posts.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('authors')}
              className={`pb-3 font-semibold transition flex items-center gap-2 ${
                activeTab === 'authors'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <User className="w-5 h-5" />
              <span>작성자 ({authors.length})</span>
            </button>
          </div>
        </div>

        {/* 검색 결과 */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <PostCardSkeleton key={index} />
            ))}
          </div>
        ) : (
          <>
            {/* 게시글 탭 */}
            {activeTab === 'posts' && (
              <div className="space-y-6">
                {posts.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">검색 결과가 없습니다.</p>
                  </div>
                ) : (
                  posts.map((post) => (
                    <div
                      key={post.id}
                      className="bg-white border rounded-lg p-6 hover:shadow-md transition"
                    >
                      <Link to={`/post/${post.id}`}>
                        {/* 제목 */}
                        <h2 className="text-xl font-bold mb-2 hover:text-blue-600 transition">
                          {highlightText(post.title, query)}
                        </h2>

                        {/* 내용 미리보기 */}
                        <p className="text-gray-600 mb-4 line-clamp-2">
                          {highlightText(
                            post.content.substring(0, 200),
                            query
                          )}
                          {post.content.length > 200 && '...'}
                        </p>

                        {/* 태그 */}
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {post.tags.slice(0, 3).map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* 메타 정보 */}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="font-medium text-gray-700">
                            {post.author_nickname}
                          </span>
                          <span>{formatDate(post.created_at)}</span>
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            <span>{post.views_count}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="w-4 h-4" />
                            <span>{post.likes_count}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" />
                            <span>{post.comments_count}</span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 작성자 탭 */}
            {activeTab === 'authors' && (
              <div className="space-y-4">
                {authors.length === 0 ? (
                  <div className="text-center py-12">
                    <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">검색 결과가 없습니다.</p>
                  </div>
                ) : (
                  authors.map((author) => (
                    <div
                      key={author.id}
                      className="bg-white border rounded-lg p-6 hover:shadow-md transition"
                    >
                      <div className="flex items-center gap-4">
                        {/* 프로필 아이콘 */}
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                          {author.nickname[0].toUpperCase()}
                        </div>

                        {/* 정보 */}
                        <div className="flex-1">
                          <h3 className="text-xl font-bold mb-1">
                            {highlightText(author.nickname, query)}
                          </h3>
                          {author.bio && (
                            <p className="text-gray-600 text-sm mb-2">
                              {author.bio}
                            </p>
                          )}
                          <p className="text-gray-500 text-xs">{author.email}</p>
                        </div>

                        {/* 프로필 보기 버튼 */}
                        <Link
                          to={`/profile/${author.id}`}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                          프로필 보기
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
