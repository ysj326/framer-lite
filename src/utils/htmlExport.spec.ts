import { describe, it, expect } from 'vitest'
import { exportHtml } from './htmlExport'
import type { Project } from '@/types/project'
import type { AppNode } from '@/types/node'
import type { Master } from '@/types/master'

const baseProject = (nodes: AppNode[], rootIds: string[]): Project => ({
  version: 1,
  name: 'Test Page',
  page: {
    id: 'p1',
    name: 'Page',
    width: 1280,
    height: 800,
    background: '#ffffff',
    rootIds,
  },
  nodes: Object.fromEntries(nodes.map((n) => [n.id, n])),
  masters: {},
  updatedAt: 0,
})

const text = (id: string, content: string, parentId: string | null = null): AppNode => ({
  id,
  type: 'text',
  name: 'T',
  parentId,
  childIds: [],
  x: 10,
  y: 20,
  width: 200,
  height: 30,
  zIndex: 0,
  visible: true,
  locked: false,
  style: {},
  data: { content },
})

describe('exportHtml', () => {
  it('빈 페이지도 valid HTML 문서 반환', () => {
    const html = exportHtml(baseProject([], []))
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<title>Test Page</title>')
    expect(html).toContain('class="page"')
    expect(html).toContain('width: 1280px')
  })

  it('text 노드는 div + class node-{id} + escape된 콘텐츠 포함', () => {
    const t = text('a', 'Hello')
    const html = exportHtml(baseProject([t], ['a']))
    expect(html).toContain('class="node node-a"')
    expect(html).toContain('>Hello</div>')
  })

  it('각 노드의 위치/크기/zIndex가 .node-{id} CSS에 들어간다', () => {
    const t = text('a', 'X')
    const html = exportHtml(baseProject([t], ['a']))
    expect(html).toContain('.node-a {')
    expect(html).toContain('left: 10px')
    expect(html).toContain('top: 20px')
    expect(html).toContain('width: 200px')
    expect(html).toContain('height: 30px')
  })

  it('HTML/스크립트 텍스트는 escape된다', () => {
    const t = text('a', '<script>alert(1)</script>')
    const html = exportHtml(baseProject([t], ['a']))
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('Frame은 div 컨테이너로 출력하고 자식 노드 마크업이 내부에 포함', () => {
    const child = text('c', 'inner', 'f')
    const frame: AppNode = {
      id: 'f',
      type: 'frame',
      name: 'F',
      parentId: null,
      childIds: ['c'],
      x: 0,
      y: 0,
      width: 400,
      height: 300,
      zIndex: 0,
      visible: true,
      locked: false,
      style: {},
      data: {},
    }
    const html = exportHtml(baseProject([frame, child], ['f']))
    expect(html).toMatch(/<div class="node node-f">[\s\S]*<div class="node node-c">[\s\S]*inner[\s\S]*<\/div>[\s\S]*<\/div>/)
  })

  it('Button(href 있음)은 <a href> 마크업, label은 escape', () => {
    const btn: AppNode = {
      id: 'b',
      type: 'button',
      name: 'B',
      parentId: null,
      childIds: [],
      x: 0,
      y: 0,
      width: 100,
      height: 40,
      zIndex: 0,
      visible: true,
      locked: false,
      style: {},
      data: { label: 'Go', href: 'https://example.com' },
    }
    const html = exportHtml(baseProject([btn], ['b']))
    expect(html).toContain('<a class="node node-b" href="https://example.com">Go</a>')
  })

  it('Button(href 없음)은 <button> 마크업', () => {
    const btn: AppNode = {
      id: 'b2',
      type: 'button',
      name: 'B',
      parentId: null,
      childIds: [],
      x: 0, y: 0, width: 100, height: 40, zIndex: 0,
      visible: true, locked: false, style: {},
      data: { label: 'Go', href: '' },
    }
    const html = exportHtml(baseProject([btn], ['b2']))
    expect(html).toContain('<button class="node node-b2">Go</button>')
  })

  it('Image(src 있음)는 <img> 태그, src/alt 속성 escape', () => {
    const img: AppNode = {
      id: 'i',
      type: 'image',
      name: 'I',
      parentId: null,
      childIds: [],
      x: 0, y: 0, width: 100, height: 100, zIndex: 0,
      visible: true, locked: false, style: {},
      data: { src: '/a.png', alt: 'My "pic"' },
    }
    const html = exportHtml(baseProject([img], ['i']))
    expect(html).toContain('<img class="node node-i" src="/a.png" alt="My &quot;pic&quot;">')
  })

  it('Shape ellipse는 border-radius 50% 포함', () => {
    const shape: AppNode = {
      id: 's',
      type: 'shape',
      name: 'S',
      parentId: null,
      childIds: [],
      x: 0, y: 0, width: 80, height: 80, zIndex: 0,
      visible: true, locked: false, style: {},
      data: { variant: 'ellipse' },
    }
    const html = exportHtml(baseProject([shape], ['s']))
    expect(html).toContain('border-radius: 50%')
  })

  it('visible=false → display: none', () => {
    const t = text('h', 'Hidden')
    t.visible = false
    const html = exportHtml(baseProject([t], ['h']))
    expect(html).toContain('display: none')
  })

  it('rotation이 0이 아니면 transform: rotate(Xdeg)가 CSS에 포함', () => {
    const t = text('r', 'spin')
    t.rotation = 45
    const html = exportHtml(baseProject([t], ['r']))
    expect(html).toContain('transform: rotate(45deg)')
  })

  it('rotation=0 또는 미지정이면 transform 선언 생략', () => {
    const t = text('r0', 'plain')
    // rotation 미지정 (legacy)
    const html = exportHtml(baseProject([t], ['r0']))
    expect(html).not.toContain('transform:')
  })

  it('NodeStyle(backgroundColor/color/fontSize 등)이 CSS에 매핑된다', () => {
    const t = text('s', 'x')
    t.style = {
      backgroundColor: '#ffeeaa',
      color: '#333',
      fontSize: 18,
      fontWeight: 700,
      borderRadius: 8,
      opacity: 0.5,
    }
    const html = exportHtml(baseProject([t], ['s']))
    expect(html).toContain('background-color: #ffeeaa')
    expect(html).toContain('color: #333')
    expect(html).toContain('font-size: 18px')
    expect(html).toContain('font-weight: 700')
    expect(html).toContain('border-radius: 8px')
    expect(html).toContain('opacity: 0.5')
  })
})

/** Instance HTML export 테스트 */
describe('HTML export with instances', () => {
  /**
   * master 노드 맵을 가진 Project fixture 생성 헬퍼.
   * @param instanceNode 페이지 루트에 배치할 Instance 노드
   * @param masters master 맵
   */
  const makeInstanceProject = (
    instanceNode: AppNode,
    masters: Record<string, Master>,
  ): Project => ({
    version: 1,
    name: 'P',
    page: {
      id: 'p',
      name: 'P',
      width: 1280,
      height: 800,
      background: '#fff',
      rootIds: [instanceNode.id],
    },
    nodes: { [instanceNode.id]: instanceNode },
    masters,
    updatedAt: 0,
  })

  it('Instance 자리에 master 트리가 인라인 전개되어 출력된다', () => {
    const inst: AppNode = {
      id: 'inst1',
      type: 'instance',
      name: 'Card',
      parentId: null,
      childIds: [],
      x: 50,
      y: 60,
      width: 200,
      height: 100,
      rotation: 0,
      zIndex: 0,
      visible: true,
      locked: false,
      style: {},
      data: { masterId: 'm1', overrides: {} },
    }

    const masters: Record<string, Master> = {
      m1: {
        id: 'm1',
        name: 'Card',
        rootId: 'r',
        createdAt: 0,
        updatedAt: 0,
        nodes: {
          r: {
            id: 'r',
            type: 'frame',
            name: 'root',
            parentId: null,
            childIds: ['t'],
            x: 0,
            y: 0,
            width: 200,
            height: 100,
            rotation: 0,
            zIndex: 0,
            visible: true,
            locked: false,
            style: {},
            data: {},
          },
          t: {
            id: 't',
            type: 'text',
            name: 'label',
            parentId: 'r',
            childIds: [],
            x: 10,
            y: 10,
            width: 120,
            height: 20,
            rotation: 0,
            zIndex: 0,
            visible: true,
            locked: false,
            style: {},
            data: { content: 'Hello' },
          },
        },
      },
    }

    const html = exportHtml(makeInstanceProject(inst, masters))
    // master 내부 text content가 HTML에 포함되어야 함
    expect(html).toContain('Hello')
    // Instance의 좌표(x: 50)가 wrapper에 적용되어야 함
    expect(html).toContain('left: 50px')
  })

  it('Instance 내부 노드의 CSS 규칙이 <style> 블록에 포함된다', () => {
    // m1 master 안의 text 노드 't'의 .node-t { ... } 가 <style>에 있어야 함
    const inst: AppNode = {
      id: 'inst1',
      type: 'instance',
      name: 'Card',
      parentId: null,
      childIds: [],
      x: 50,
      y: 60,
      width: 200,
      height: 100,
      rotation: 0,
      zIndex: 0,
      visible: true,
      locked: false,
      style: {},
      data: { masterId: 'm1', overrides: {} },
    }

    const masters: Record<string, Master> = {
      m1: {
        id: 'm1',
        name: 'Card',
        rootId: 'r',
        createdAt: 0,
        updatedAt: 0,
        nodes: {
          r: {
            id: 'r',
            type: 'frame',
            name: 'root',
            parentId: null,
            childIds: ['t'],
            x: 0,
            y: 0,
            width: 200,
            height: 100,
            rotation: 0,
            zIndex: 0,
            visible: true,
            locked: false,
            style: {},
            data: {},
          },
          t: {
            id: 't',
            type: 'text',
            name: 'label',
            parentId: 'r',
            childIds: [],
            x: 10,
            y: 10,
            width: 120,
            height: 20,
            rotation: 0,
            zIndex: 0,
            visible: true,
            locked: false,
            style: {},
            data: { content: 'Hello' },
          },
        },
      },
    }

    const html = exportHtml(makeInstanceProject(inst, masters))
    expect(html).toContain('.node-t {')
  })

  it('master rootFrame의 backgroundColor가 wrapper에 반영된다', () => {
    const inst: AppNode = {
      id: 'inst2',
      type: 'instance',
      name: 'Card',
      parentId: null,
      childIds: [],
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      rotation: 0,
      zIndex: 0,
      visible: true,
      locked: false,
      style: {},
      data: { masterId: 'm2', overrides: {} },
    }

    const masters: Record<string, Master> = {
      m2: {
        id: 'm2',
        name: 'RedCard',
        rootId: 'rf',
        createdAt: 0,
        updatedAt: 0,
        nodes: {
          rf: {
            id: 'rf',
            type: 'frame',
            name: 'root',
            parentId: null,
            childIds: [],
            x: 0,
            y: 0,
            width: 200,
            height: 100,
            rotation: 0,
            zIndex: 0,
            visible: true,
            locked: false,
            style: { backgroundColor: 'red' },
            data: {},
          },
        },
      },
    }

    const html = exportHtml(makeInstanceProject(inst, masters))
    // wrapper div의 인라인 style에 background-color: red 가 있어야 함
    expect(html).toMatch(/background-color:\s*red/)
  })

  it('master가 없는 Instance는 주석 fallback 포함', () => {
    const inst: AppNode = {
      id: 'x',
      type: 'instance',
      name: 'Broken',
      parentId: null,
      childIds: [],
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      rotation: 0,
      zIndex: 0,
      visible: true,
      locked: false,
      style: {},
      data: { masterId: 'nope', overrides: {} },
    }

    const html = exportHtml(makeInstanceProject(inst, {}))
    expect(html).toContain('missing master')
  })
})
