import { push, level } from '../node'
import { Lexer } from '../tokenize'
import { Document, Section } from '../../types'
import parseBlock from './block'
import parseDrawer from './drawer'
import parseHeadline from './headline'
import parseKeyword from './keyword'
import parseList from './list'
import parseTable from './table'
import parseParagraph from './paragraph'
import parsePlanning from './planning'
import utils from './utils'

export default (lexer: Lexer) => <T extends Document | Section>(root: T): T => {

  const { peek, eat } = lexer
  const { tryTo } = utils(lexer)

  const newSection = (): Section => {
    const section: Section = {
      type: 'section',
      properties: {},
      children: [],
    }
    const headline = parseHeadline(lexer)
    push(section)(headline)
    const plannings = parsePlanning(lexer)
    plannings.forEach(push(section))

    while (tryTo(parseDrawer, drawer => {
      if (drawer.name.toLowerCase() === 'properties') {
        section.properties = drawer.value.split('\n').reduce((accu, current) => {
          const m = current.match(/\s*:(.+):\s*(.+)\s*$/)
          if (m) {
            return { ...accu, [m[1].toLowerCase()]: m[2] }
          }
          return accu
        }, section.properties)
      }
      push(section)(drawer)
    })) continue
    return section
  }

  const parse = <T extends Document | Section>(section: T): T => {

    const token = peek()
    if (!token) return section

    // section
    if (token.type === 'stars') {
      if (section.type === 'document' || token.level > level(section)) {
        const ns = newSection()
        push(section)(parse(ns))
        return parse(section)
      } else {
        return section
      }
    }

    // paragraph
    if (tryTo(parseParagraph, push(section))) {
      return parse(section)
    }

    // list
    if (tryTo(parseList, push(section))) {
      return parse(section)
    }

    // table
    if (tryTo(parseTable, push(section))) {
      return parse(section)
    }

    // block
    if (tryTo(parseBlock, push(section))) {
      return parse(section)
    }

    // keyword
    if (tryTo(parseKeyword, keyword => {
      section.properties[keyword.key] = keyword.value
      push(section)
    })) {
      return parse(section)
    }

    if (token.type == 'hr') {
      push(section)(token)
    }

    // skip(t => t.type === 'newline')
    // push(section)(token)
    // console.log(`skip: ${token.type}`)
    eat()

    return parse(section)
  }

  parse(root)
  return root
}
