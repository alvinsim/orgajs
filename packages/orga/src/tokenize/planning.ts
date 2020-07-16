import { Reader } from '../reader'
import { inspect }  from 'util'
import { parse as parseTimestamp } from '../timestamp'

interface Props {
  reader: Reader;
  keywords: string[];
  timezone: string;
}


export default ({ reader, keywords, timezone }: Props) : Token[] => {
  const { eat, substring, now, getLine } = reader

  const p = RegExp(`(${keywords.join('|')}):`, 'g')

  const currentLine = getLine()

  const { line, column } = now()

  const getLocation = (offset: number): Point => ({
    line, column: column + offset,
  })

  const all: any[] = []

  const parseLastTimestamp = (end: number) => {
    if (all.length == 0) return
    const { name, position } = all[all.length - 1]
    if (name !== 'planning.keyword') return
    const endLocation = getLocation(end)
    const timestampPosition = { start: position.end, end: endLocation }
    const value = substring(timestampPosition)
    all.push({
      name: 'planning.timestamp',
      data: parseTimestamp(value, { timezone }),
      position: timestampPosition,
    })
  }

  let m
  while ((m = p.exec(currentLine)) !== null) {
    parseLastTimestamp(m.index)

    all.push({
      name: 'planning.keyword',
      data: {
        keyword: m[1],
      },
      position: {
        start: getLocation(m.index),
        end: getLocation(p.lastIndex),
      },
    })
  }
  parseLastTimestamp(currentLine.length)
  eat('line')

  // console.log(inspect(all, false, null, true))
  // const timestamp = () => {

  // }

  // const planning = () => {
  //   const keyword = getKeyword()
  //   if (!keyword) return
  //   eat(keyword.length)
  // }
  return all
}
