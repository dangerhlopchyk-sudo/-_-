import { renderAuth } from './blocks/auth'
import { renderCards } from './blocks/cards'
import { renderForm } from './blocks/form'
import { renderSummary } from './blocks/summary'
import { renderToolbar } from './blocks/toolbar'
import type { BlockRenderer, BlockRendererRegistry, PageBlock } from './types'

const renderers: BlockRendererRegistry = {
  auth: renderAuth,
  summary: renderSummary,
  toolbar: renderToolbar,
  cards: renderCards,
  form: renderForm,
}

function renderBlock(block: PageBlock): string {
  const render = renderers[block.type] as BlockRenderer<PageBlock>
  return render(block)
}

export function renderBlocks(blocks: PageBlock[]): string {
  return blocks.map(renderBlock).join('')
}
