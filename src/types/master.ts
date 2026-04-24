import type { AppNode } from './node'

/**
 * 재사용 가능한 컴포넌트 정의(마스터).
 * Instance 노드는 `data.masterId`로 이 정의를 참조해 렌더된다.
 *
 * `nodes`는 master 고유 namespace로, Project.page.nodes와 id 공간이 분리된다.
 * 같은 id가 양쪽에 존재해도 두 Record는 독립 조회되므로 섞일 일이 없다.
 */
export interface Master {
  /** nanoid로 생성된 마스터 식별자 */
  id: string
  /** 표시 이름 (예: "Card"). 중복 시 변환 로직에서 "(N)" suffix로 고유화 */
  name: string
  /** master 내부 루트 Frame 노드의 id. 반드시 `nodes[rootId]`에 존재해야 함 */
  rootId: string
  /** master 고유 namespace의 노드 평면 저장소 */
  nodes: Record<string, AppNode>
  /** 생성 시각 (epoch ms) */
  createdAt: number
  /** 마지막 수정 시각 (epoch ms). 19a에서는 createMaster 이후 변경되지 않음 */
  updatedAt: number
}
