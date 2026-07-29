import fs from 'node:fs'
import path from 'node:path'
import paper from 'paper'
import { Resvg } from '@resvg/resvg-js'

const COMMA =
  'M13.125,17.3843c0,-0.7734 0.2643,-1.4295 0.793,-1.9685c0.5516,-0.5625 1.2182,-0.8437 1.9996,-0.8437c0.7355,0 1.3791,0.2812 1.9308,0.8437c0.5516,0.539 0.8734,1.1483 0.9653,1.8279c0.1839,1.2655 -0.046,2.5192 -0.6895,3.7613c-0.6206,1.242 -1.517,2.1911 -2.6892,2.8473c-0.6436,0.375 -1.1723,0.3632 -1.586,-0.0351c-0.3907,-0.375 -0.2758,-0.8203 0.3448,-1.3358c0.3448,-0.2578 0.6321,-0.5859 0.8619,-0.9843c0.2299,-0.3984 0.3793,-0.8085 0.4482,-1.2303c0.023,-0.1875 -0.0574,-0.2812 -0.2413,-0.2812c-0.4597,-0.0235 -0.9309,-0.2813 -1.4136,-0.7734c-0.4827,-0.4921 -0.724,-1.1014 -0.724,-1.8279z'
const BULB_CENTER = [15.97, 17]
const BULB_RADIUS = 2.43
function parseArgs(argv) {
  const values = {}
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]
    if (!key?.startsWith('--') || argv[i + 1] === undefined) {
      throw new Error(`Expected --name value, got ${key ?? 'end of input'}`)
    }
    values[key.slice(2)] = argv[i + 1]
  }
  for (const required of ['tittle', 'center', 'box', 'base-color', 'output']) {
    if (!values[required]) throw new Error(`Missing --${required}`)
  }
  return values
}

function pair(value, name) {
  const parts = value.split(',').map(Number)
  if (parts.length !== 2 || parts.some(Number.isNaN)) {
    throw new Error(`--${name} must be x,y`)
  }
  return parts
}

function sourcePaths(svg) {
  const paths = []
  for (const match of svg.matchAll(/<path\b([^>]*?)\/?>/gs)) {
    const attrs = match[1]
    const data = attrs.match(/\bd="([^"]+)"/s)?.[1]
    if (!data) continue
    const fill = attrs.match(/\bfill="([^"]+)"/)?.[1] ?? 'base'
    const fillRule = attrs.match(/\bfill-rule="([^"]+)"/)?.[1] ?? 'nonzero'
    paths.push({ data, fill, fillRule })
  }
  if (!paths.length) throw new Error('The tittle SVG contains no paths')
  return paths
}

function xml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
}

const args = parseArgs(process.argv.slice(2))
const [centerX, centerY] = pair(args.center, 'center')
const [boxWidth, boxHeight] = pair(args.box, 'box')
const source = fs.readFileSync(args.tittle, 'utf8')

paper.setup(new paper.Size(32, 32))
const items = sourcePaths(source).map(({ data, fill, fillRule }) => {
  const item = paper.PathItem.create(data)
  item.fillRule = fillRule
  return {
    item,
    fill: fill === 'base' ? args['base-color'] : fill,
    fillRule,
  }
})
const group = new paper.Group(items.map(({ item }) => item))
const scale = Math.min(boxWidth / group.bounds.width, boxHeight / group.bounds.height)
group.scale(scale)
group.position = new paper.Point(centerX, centerY)

const rotatedComma = new paper.Path({ pathData: COMMA })
rotatedComma.rotate(180, new paper.Point(...BULB_CENTER))
const bulb = new paper.Path.Circle(new paper.Point(...BULB_CENTER), BULB_RADIUS)
const mask = rotatedComma.subtract(bulb)

const masked = items.map(({ item, fill, fillRule }) => {
  const result = item.subtract(mask)
  result.fillRule = fillRule
  return { data: result.pathData, fill, fillRule }
})

const metadata = {
  generator: 'scripts/build-mark.mjs',
  tittle: path.relative(process.cwd(), args.tittle),
  center: [centerX, centerY],
  box: [boxWidth, boxHeight],
  baseColor: args['base-color'],
}
const paths = masked
  .map(
    ({ data, fill, fillRule }) =>
      `  <path fill="${xml(fill)}" fill-rule="${xml(fillRule)}" d="${xml(data)}"/>`,
  )
  .join('\n')
const background =
  args.background && args.background !== 'transparent'
    ? `\n  <rect x="4" y="3" width="24" height="24" fill="${xml(args.background)}"/>`
    : ''
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="4 3 24 24">
  <metadata>${xml(JSON.stringify(metadata))}</metadata>
${background}
${paths}
  <path fill="${xml(args['base-color'])}" d="${COMMA}"/>
</svg>
`

fs.mkdirSync(path.dirname(args.output), { recursive: true })
fs.writeFileSync(`${args.output}-mark.svg`, svg)
for (const size of [512, 40]) {
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
  }).render().asPng()
  fs.writeFileSync(`${args.output}-${size}.png`, png)
}
