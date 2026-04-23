/**
 * Blob을 임시 anchor로 사용자에게 다운로드시킨다.
 * 브라우저 환경에서만 실제 동작하며, 테스트 환경에서는 효과 없음을 가정.
 * JSON/HTML 등 모든 다운로드 경로에서 재사용한다.
 * @param blob 다운로드할 Blob
 * @param filename 저장 파일명
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

/**
 * 파일명에서 사용 불가 문자(공백·슬래시·특수기호 등)를 안전한 형태로 치환한다.
 * @param raw 원본 문자열 (없거나 빈 값이면 fallback 사용)
 * @param fallback 빈 결과일 때 대체 이름
 * @returns 치환된 안전 파일명
 */
export const safeFilename = (raw: string | undefined, fallback: string): string => {
  const cleaned = (raw ?? '').replace(/[^\w.\-]+/g, '_').replace(/^_+|_+$/g, '')
  return cleaned || fallback
}
