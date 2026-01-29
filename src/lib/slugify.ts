/**
 * 제목을 URL-safe한 slug로 변환
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    // 한글을 로마자로 변환 (간단한 버전)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // 공백을 하이픈으로
    .replace(/\s+/g, '-')
    // 특수문자 제거
    .replace(/[^\w\-가-힣]/g, '')
    // 한글 유지 또는 제거 (원하는 대로 선택)
    // 여기서는 한글을 유지
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * 고유한 slug 생성 (중복 시 숫자 추가)
 */
export function generateUniqueSlug(title: string): string {
  const baseSlug = slugify(title);
  const timestamp = Date.now().toString(36);
  return `${baseSlug}-${timestamp}`;
}
