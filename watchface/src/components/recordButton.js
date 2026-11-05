// Lime record button: opens the watch's own Voice Memo app (memos sync to Gadgetbridge).
import ui from '@zos/ui'
import { launchApp, SYSTEM_APP_VOICE_MEMO } from '@zos/router'

export function createRecordButton(screen) {
  screen.widget(ui.widget.BUTTON, {
    x: 296, y: 352, w: 56, h: 56, normal_src: 'images/rec.png', press_src: 'images/rec-pressed.png',
    click_func: () => {
      try {
        launchApp({ appId: SYSTEM_APP_VOICE_MEMO, native: true })
      } catch (e) {
        // no Voice Memo app on this watch
      }
    },
  })
}
