<script setup lang="ts">
import Canvas from './Canvas.vue'
import Toolbar from './Toolbar.vue'
import LayersPanel from './LayersPanel.vue'
import PropertiesPanel from './PropertiesPanel.vue'

/**
 * 에디터 화면의 3-column 그리드 골격.
 * - topbar: Toolbar
 * - layers: LayersPanel
 * - canvas: Canvas
 * - props : PropertiesPanel
 */
</script>

<template>
  <div class="editor-layout">
    <header class="editor-layout__topbar">
      <Toolbar />
    </header>
    <aside class="editor-layout__layers">
      <LayersPanel />
    </aside>
    <main class="editor-layout__canvas">
      <Canvas />
    </main>
    <aside class="editor-layout__props">
      <PropertiesPanel />
    </aside>
  </div>
</template>
