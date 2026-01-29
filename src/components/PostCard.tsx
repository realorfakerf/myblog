import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Eye } from 'lucide-react';

interface PostCardProps {
  post: {
    id: string;
    title: string;
    content: string;
    slug: string;
    tags: string[];
    created_at: string;
    views_count: number;
    cover_image?: string;
    author: {
      id: string;
      nickname: string;
      email: string;
    };
    likes_count: number;
    comments_count: number;
  };
}

// 그라데이션 배경 색상 배열
const gradients = [
  'bg-gradient-to-br from-purple-400 via-pink-500 to-red-500',
  'bg-gradient-to-br from-blue-400 via-cyan-500 to-teal-500',
  'bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500',
  'bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500',
  'bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500',
  'bg-gradient-to-br from-rose-400 via-fuchsia-500 to-purple-500',
];

// 날짜를 "3일 전" 형식으로 변환
function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return '방금 전';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}일 전`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}개월 전`;
  return `${Math.floor(diffInSeconds / 31536000)}년 전`;
}

export function PostCard({ post }: PostCardProps) {
  // 내용 미리보기 (150자)
  const contentPreview = post.content.slice(0, 150) + (post.content.length > 150 ? '...' : '');
  
  // 게시글 ID를 기반으로 그라데이션 선택
  const gradientIndex = parseInt(post.id.slice(0, 8), 16) % gradients.length;
  const gradient = gradients[gradientIndex];

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 group">
      {/* 대표 이미지 또는 그라데이션 */}
      <Link to={`/post/${post.id}`} className="block">
        <div className="h-48 relative overflow-hidden">
          {post.cover_image ? (
            <img
              src={post.cover_image}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className={`w-full h-full ${gradient}`}></div>
          )}
          <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity"></div>
        </div>
      </Link>

      {/* 카드 내용 */}
      <div className="p-5">
        {/* 제목 */}
        <Link to={`/post/${post.id}`}>
          <h2 className="text-xl font-bold mb-2 line-clamp-2 hover:text-blue-600 transition-colors">
            {post.title}
          </h2>
        </Link>

        {/* 내용 미리보기 */}
        <Link to={`/post/${post.id}`}>
          <p className="text-gray-600 text-sm mb-4 line-clamp-3">
            {contentPreview}
          </p>
        </Link>

        {/* 태그 */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* 작성자 정보와 날짜 */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b">
          <Link
            to={`/profile/${post.author.id}`}
            className="flex items-center gap-2 hover:opacity-80 transition"
          >
            {/* 프로필 아이콘 */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
              {post.author.nickname ? post.author.nickname[0].toUpperCase() : 'U'}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {post.author.nickname || post.author.email}
              </p>
              <p className="text-xs text-gray-500">
                {getRelativeTime(post.created_at)}
              </p>
            </div>
          </Link>
        </div>

        {/* 통계 */}
        <div className="flex items-center gap-4 text-gray-500 text-sm">
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            <span>{post.likes_count || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            <span>{post.comments_count || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{post.views_count || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
