import {ImageResponse} from 'next/og'

export const runtime = 'edge'
export const alt = 'unredact: is your redaction actually safe?'
export const size = {width: 1200, height: 630}
export const contentType = 'image/png'

/**
 * A generic, content-free share image. It intentionally encodes NOTHING about
 * any user's document — only the product's branding — so a public link preview
 * can never leak a result. Per-result cards are generated client-side instead.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: '#16151C',
        color: '#F9F5EC',
        padding: '64px',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '9999px',
            backgroundColor: '#FF392E',
          }}
        />
        <div style={{fontSize: '34px', fontWeight: 700}}>unredact</div>
        <div style={{fontSize: '24px', color: 'rgba(249,245,236,0.5)'}}>
          by phaselaw
        </div>
      </div>

      <div style={{display: 'flex', flexDirection: 'column'}}>
        <div style={{fontSize: '76px', fontWeight: 800, lineHeight: 1.05}}>
          Is your redaction
        </div>
        <div
          style={{
            fontSize: '76px',
            fontWeight: 800,
            lineHeight: 1.05,
            color: '#FF392E',
          }}
        >
          actually safe?
        </div>
        <div
          style={{
            marginTop: '24px',
            fontSize: '30px',
            color: 'rgba(249,245,236,0.75)',
            maxWidth: '900px',
          }}
        >
          Many “redacted” PDFs still contain the hidden text. Check yours in the
          browser. It never leaves your device.
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          fontSize: '26px',
          color: 'rgba(249,245,236,0.6)',
        }}
      >
        unredact.phaselab.co
      </div>
    </div>,
    {...size}
  )
}
