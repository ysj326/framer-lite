import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import TemplatesView from '@/views/TemplatesView.vue'
import EditorView from '@/views/EditorView.vue'
import PreviewView from '@/views/PreviewView.vue'

/**
 * 애플리케이션 라우트 정의.
 * - `/`        : 템플릿 갤러리 (TemplatesView)
 * - `/editor`  : 비주얼 에디터 (EditorView)
 * - `/preview` : 결과 미리보기 (PreviewView)
 */
const routes: RouteRecordRaw[] = [
  { path: '/', name: 'templates', component: TemplatesView },
  { path: '/editor', name: 'editor', component: EditorView },
  { path: '/preview', name: 'preview', component: PreviewView },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
