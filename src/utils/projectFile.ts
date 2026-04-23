import type { Project } from '@/types/project'
import { toJSON, fromJSON } from './serialize'
import { downloadBlob, safeFilename } from './download'

/**
 * Project를 JSON Blob으로 만든다.
 * 다운로드/공유 등 다양한 출력 경로에서 재사용한다.
 * @param project 직렬화할 프로젝트
 * @returns application/json MIME의 Blob
 */
export const buildProjectBlob = (project: Project): Blob =>
  new Blob([toJSON(project)], { type: 'application/json' })

/**
 * 프로젝트를 사용자에게 .json 파일로 다운로드시킨다.
 * @param project 다운로드할 프로젝트
 * @param filename 저장 파일명 (기본: `${project.name || 'project'}.json`)
 */
export const downloadProject = (project: Project, filename?: string): void => {
  const blob = buildProjectBlob(project)
  downloadBlob(blob, filename ?? `${safeFilename(project.name, 'project')}.json`)
}

/**
 * 사용자가 업로드한 File을 Project로 변환한다.
 * 잘못된 내용이면 null.
 * @param file File 객체 (HTMLInputElement[type=file])
 * @returns Project 또는 null
 */
export const readProjectFile = async (file: File): Promise<Project | null> => {
  const text = await file.text()
  return fromJSON(text)
}
