import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

interface ImageUploadProps {
  onImageUploaded: (url: string) => void;
  currentImageUrl?: string;
  onImageRemoved?: () => void;
}

export function ImageUpload({
  onImageUploaded,
  currentImageUrl,
  onImageRemoved,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentImageUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const MAX_WIDTH = 1920;

  // 이미지 리사이징 함수
  const resizeImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // 최대 너비 제한
          if (width > MAX_WIDTH) {
            height = (height * MAX_WIDTH) / width;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context를 가져올 수 없습니다.'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('이미지 변환에 실패했습니다.'));
              }
            },
            file.type,
            0.9 // 품질 90%
          );
        };
        img.onerror = () => reject(new Error('이미지 로드에 실패했습니다.'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('파일 읽기에 실패했습니다.'));
      reader.readAsDataURL(file);
    });
  };

  // 파일 유효성 검사
  const validateFile = (file: File): boolean => {
    // 파일 형식 확인
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('jpg, png, gif, webp 파일만 업로드 가능합니다.');
      return false;
    }

    // 파일 크기 확인
    if (file.size > MAX_SIZE) {
      toast.error('파일이 너무 큽니다. 최대 5MB까지 가능합니다.');
      return false;
    }

    return true;
  };

  // 파일 업로드
  const uploadFile = async (file: File) => {
    if (!validateFile(file)) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // 이미지 리사이징
      setUploadProgress(20);
      const resizedBlob = await resizeImage(file);
      
      setUploadProgress(40);

      // 파일명 생성 (타임스탬프 + 랜덤)
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `post-covers/${fileName}`;

      setUploadProgress(60);

      // Supabase Storage에 업로드
      const { data, error } = await supabase.storage
        .from('blog-images')
        .upload(filePath, resizedBlob, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        // 버킷이 없으면 생성
        if (error.message.includes('Bucket not found')) {
          toast.error('스토리지 버킷이 없습니다. Supabase 대시보드에서 blog-images 버킷을 생성해주세요.');
        } else {
          throw error;
        }
        return;
      }

      setUploadProgress(80);

      // 공개 URL 가져오기
      const { data: urlData } = supabase.storage
        .from('blog-images')
        .getPublicUrl(filePath);

      setUploadProgress(100);

      const publicUrl = urlData.publicUrl;
      setPreviewUrl(publicUrl);
      onImageUploaded(publicUrl);
      toast.success('이미지가 업로드되었습니다!');
    } catch (error) {
      console.error('이미지 업로드 오류:', error);
      toast.error('이미지 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // 드래그 이벤트
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      uploadFile(files[0]);
    }
  };

  // 파일 선택
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      uploadFile(files[0]);
    }
  };

  // 이미지 삭제
  const handleRemoveImage = () => {
    setPreviewUrl(undefined);
    if (onImageRemoved) {
      onImageRemoved();
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium mb-2">
        대표 이미지 <span className="text-gray-400 font-normal">(선택)</span>
      </label>

      {previewUrl ? (
        // 미리보기
        <div className="relative group">
          <img
            src={previewUrl}
            alt="대표 이미지"
            className="w-full h-64 object-cover rounded-lg"
          />
          <button
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition opacity-0 group-hover:opacity-100"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        // 업로드 영역
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50'
          } ${uploading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />

          {uploading ? (
            <div className="space-y-4">
              <Upload className="w-12 h-12 mx-auto text-blue-500 animate-bounce" />
              <div>
                <p className="text-sm font-medium mb-2">업로드 중...</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{uploadProgress}%</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <ImageIcon className="w-12 h-12 mx-auto text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700">
                  이미지를 드래그하거나 클릭하여 업로드
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  JPG, PNG, GIF, WEBP (최대 5MB)
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
