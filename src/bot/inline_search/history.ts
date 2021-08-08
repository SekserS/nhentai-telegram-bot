import Context from 'telegraf/typings/context'
import config  from '../../../config'
import i18n 	 from '../../i18n'
import Verror  from 'verror'
import Manga   from '../../models/manga.model.js'

import { getMangaMessage, isFullColor, sliceByHalf } from '../some_functions'

import {
  InlineQueryResultArticle,
  // InlineQueryResultPhoto,
} 										from 'typegram'
import { Document } 	from 'mongoose'
import { UserSchema } from '../../models/user.model'

const history_reply_markup = {
  inline_keyboard: [
    [
      {
        text:                             i18n.__('history_tip_title'),
        switch_inline_query_current_chat: '/h',
      },
    ],
  ],
}
export default async function replyWithHistoryInline(
  ctx: Context,
  user: UserSchema & Document<any, any, UserSchema>
): Promise<void> {
  // const searchType = 'article'
  // if (searchType === 'photo') {
  //   const results: InlineQueryResultPhoto[] = await getFavotitesPhoto(user, specifiedPage, inlineQuery)
  //   try {
  //     ctx.answerInlineQuery(results, {
  //       cache_time:  0,
  //       is_personal: true,
  //     })
  //   } catch (error){
  //     throw new Verror(error, 'Answer Inline Favorites Photo')
  //   }
  // } else {
  const results: InlineQueryResultArticle[] = await getHistoryArticle(user)
  try {
    ctx.answerInlineQuery(results, {
      cache_time:  0,
      is_personal: true,
    })
  } catch (error){
    throw new Verror(error, 'Answer Inline Favorites Article')
  }
  // }
}

async function getHistoryArticle(
  user: UserSchema & Document<any, any, UserSchema>
): Promise<InlineQueryResultArticle[]> {
  const results: InlineQueryResultArticle[] = []
  if (!Array.isArray(user.manga_history) || user.manga_history.length === 0) {
    // history is empty
    results.push({
      id:                    String(69696969696969),
      type:                  'article',
      title:                 i18n.__('history_tip_title'),
      description:           i18n.__('history_is_empty'),
      thumb_url:             config.history_icon_inline,
      input_message_content: {
        message_text: i18n.__('tap_to_open_history'),
        parse_mode:   'HTML',
      },
      reply_markup: history_reply_markup,
    })
    return results
  }
  // get all info about manga from database in the same order 
  const history = await Manga.find({ 'id': { $in: user.manga_history } })
  history.sort(function (a, b) {
    // Sort docs by the order of their _id values in ids.
    return user.manga_history.indexOf(a.id) - user.manga_history.indexOf(b.id)
  })
  for (const doujin of history){
    const message_text = getMangaMessage(
      doujin,
      doujin.telegraph_url,
    )
    const description = sliceByHalf(doujin.title)
    const heart = user.favorites.findIndex(item => item._id === doujin._id) ? config.like_button_true : config.like_button_false
    const inline_keyboard = [
      [
        { text: 'Telegra.ph', url: String(doujin.telegraph_url) },
        { text: heart, callback_data: 'like_' + doujin.id },
      ],
    ]
    if (!doujin.telegraph_fixed_url && (doujin.pages > config.pages_to_show_fix_button || isFullColor(doujin))) {
      inline_keyboard[0].unshift({
        text:          i18n.__('fix_button'),
        callback_data: 'fix_' + doujin.id,
      })
    }
    results.push({
      id:    doujin._id,
      type:  'article',
      title: doujin.title
        .replace('<', '\\<')
        .replace('>', '\\>')
        .trim(),
      description: description
        .replace('<', '\\<')
        .replace('>', '\\>')
        .trim(),
      input_message_content: {
        message_text: message_text,
        parse_mode:   'HTML',
      },
      reply_markup: {
        inline_keyboard: inline_keyboard,
      },
    })
  }
  results.push({
    id:                    String(69696969696969),
    type:                  'article',
    title:                 i18n.__('history_tip_title'),
    description:           i18n.__('history_tip_desctiption'),
    thumb_url:             config.history_icon_inline,
    input_message_content: {
      message_text: i18n.__('tap_to_open_history'),
      parse_mode:   'HTML',
    },
    reply_markup: history_reply_markup,
  })
  results.reverse()
  return results
}
  