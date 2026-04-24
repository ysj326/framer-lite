import type { Project } from '@/types/project'
import type { AppNode } from '@/types/node'
import type { Master } from '@/types/master'
import { downloadBlob, safeFilename } from './download'

/** instance 인라인 전개 최대 재귀 깊이 (19f Nesting 대비 안전장치) */
const MAX_INSTANCE_DEPTH = 32

/**
 * HTML 텍스트 노드 안에 들어갈 사용자 입력을 escape한다.
 * XSS와 깨진 마크업을 방지한다.
 * @param str 임의 문자열
 * @returns escape된 문자열
 */
const escapeHtml = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

/**
 * HTML attribute 값(쌍따옴표로 감싼 형태) 안에 들어갈 문자열을 escape한다.
 * @param str 임의 문자열
 * @returns escape된 문자열
 */
const escapeAttr = (str: string): string =>
  str.replace(/&/g, '&amp;').replace(/"/g, '&quot;')

/**
 * 한 노드의 위치/크기/스타일을 CSS 선언 배열로 만든다.
 * Shape ellipse는 border-radius 50%로 강제 적용한다.
 * @param node 대상 노드
 * @returns CSS 선언 문자열 배열 (세미콜론 미포함)
 */
const collectNodeDecls = (node: AppNode): string[] => {
  const out: string[] = [
    `left: ${node.x}px`,
    `top: ${node.y}px`,
    `width: ${node.width}px`,
    `height: ${node.height}px`,
    `z-index: ${node.zIndex}`,
  ]
  // rotation: 0도는 transform 생략해 CSS 부담과 페인트 변동 최소화
  const rotation = node.rotation ?? 0
  if (rotation !== 0) out.push(`transform: rotate(${rotation}deg)`)
  if (!node.visible) out.push('display: none')

  const s = node.style
  if (s.opacity !== undefined) out.push(`opacity: ${s.opacity}`)
  if (s.backgroundColor) out.push(`background-color: ${s.backgroundColor}`)
  if (s.color) out.push(`color: ${s.color}`)
  if (s.fontSize !== undefined) out.push(`font-size: ${s.fontSize}px`)
  if (s.fontWeight !== undefined) out.push(`font-weight: ${s.fontWeight}`)
  if (s.borderRadius !== undefined) out.push(`border-radius: ${s.borderRadius}px`)

  if (node.type === 'shape' && node.data.variant === 'ellipse') {
    out.push('border-radius: 50%')
  }
  return out
}

/**
 * 노드 1개에 대한 .node-{id} CSS 규칙을 만든다.
 * @param node 대상 노드
 * @returns 한 줄 CSS rule 문자열
 */
const buildNodeCss = (node: AppNode): string => {
  const decls = collectNodeDecls(node).join('; ')
  return `.node-${node.id} { ${decls}; }`
}

/**
 * 노드 1개의 HTML 마크업을 만든다 (Frame이면 자식 재귀, Instance이면 master 트리 인라인 전개).
 * @param node 대상 노드
 * @param nodes 현재 scope의 노드 맵 (자식 lookup)
 * @param masters 프로젝트 전체 master 맵 (instance 전개 시 참조)
 * @param depth 현재 재귀 깊이 (MAX_INSTANCE_DEPTH 초과 시 fallback 주석 반환)
 * @returns HTML 문자열
 */
const buildNodeHtml = (
  node: AppNode,
  nodes: Record<string, AppNode>,
  masters: Record<string, Master>,
  depth = 0,
): string => {
  const cls = `node node-${node.id}`

  if (node.type === 'text') {
    return `<div class="${cls}">${escapeHtml(node.data.content)}</div>`
  }
  if (node.type === 'image') {
    if (!node.data.src) return `<div class="${cls}"></div>`
    return `<img class="${cls}" src="${escapeAttr(node.data.src)}" alt="${escapeAttr(node.data.alt)}">`
  }
  if (node.type === 'button') {
    const label = escapeHtml(node.data.label)
    if (node.data.href) {
      return `<a class="${cls}" href="${escapeAttr(node.data.href)}">${label}</a>`
    }
    return `<button class="${cls}">${label}</button>`
  }
  if (node.type === 'shape') {
    return `<div class="${cls}"></div>`
  }
  if (node.type === 'instance') {
    // 재귀 깊이 초과 시 안전 fallback (19f Nesting 대비)
    if (depth > MAX_INSTANCE_DEPTH) {
      return `<!-- instance depth exceeded for ${node.id} -->`
    }
    const master: Master | undefined = masters[node.data.masterId]
    if (!master) {
      // master 정의 없음 → 주석 fallback
      return `<!-- missing master: ${node.data.masterId} --><div class="${cls}"></div>`
    }
    // Instance 자신의 좌표/크기를 wrapper 스타일로 사용 (정책 B: master rootFrame 좌표 무시)
    const wrapperDecls = collectNodeDecls(node).join('; ')
    const rootNode = master.nodes[master.rootId]
    const inner = rootNode
      ? rootNode.childIds
          .map((cid) => master.nodes[cid])
          .filter((c): c is AppNode => c !== undefined)
          .map((c) => buildNodeHtml(c, master.nodes, masters, depth + 1))
          .join('\n')
      : ''
    return `<div class="${cls}" style="${wrapperDecls};">\n${inner}\n</div>`
  }
  // frame
  const inner = node.childIds
    .map((cid) => nodes[cid])
    .filter((c): c is AppNode => c !== undefined)
    .map((c) => buildNodeHtml(c, nodes, masters, depth))
    .join('\n')
  return `<div class="${cls}">\n${inner}\n</div>`
}

/**
 * Project 전체를 standalone HTML 문서 문자열로 변환한다.
 * 결과는 외부 의존성 없는 단일 .html 파일로 바로 열 수 있다.
 * @param project 변환할 프로젝트
 * @returns 완전한 HTML 문서 문자열
 */
export const exportHtml = (project: Project): string => {
  const allNodes = Object.values(project.nodes)
  const cssRules = allNodes.map(buildNodeCss).join('\n  ')

  const rootMarkup = project.page.rootIds
    .map((id) => project.nodes[id])
    .filter((n): n is AppNode => n !== undefined)
    .map((n) => buildNodeHtml(n, project.nodes, project.masters, 0))
    .join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(project.name)}</title>
<style>
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  .page {
    position: relative;
    width: ${project.page.width}px;
    height: ${project.page.height}px;
    background: ${project.page.background};
    margin: 0 auto;
    overflow: hidden;
  }
  .node { position: absolute; box-sizing: border-box; }
  a.node, button.node {
    text-decoration: none;
    border: 0;
    font-family: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    text-align: center;
  }
  img.node { object-fit: cover; }
  ${cssRules}
</style>
</head>
<body>
<div class="page">
${rootMarkup}
</div>
</body>
</html>
`
}

/**
 * Project를 HTML로 export한 뒤 사용자에게 파일을 다운로드시킨다.
 * @param project 변환할 프로젝트
 * @param filename 저장 파일명 (기본: `${project.page.name}.html`)
 */
export const downloadHtml = (project: Project, filename?: string): void => {
  const html = exportHtml(project)
  const blob = new Blob([html], { type: 'text/html' })
  downloadBlob(blob, filename ?? `${safeFilename(project.page.name, 'page')}.html`)
}
