require('dotenv').config()
const { Telegraf } = require('telegraf')
const fs = require('fs/promises')
const fetch = require('node-fetch')
const withQuery = require('with-query').default
const {MenuTemplate, MenuMiddleware} = require('telegraf-inline-menu')

const GIPHY_ENDPOINT = 'https://api.giphy.com/v1/gifs/search'
const GIPHY_API_KEY = process.env.GIPHY_API_KEY || "";
const NEWSAPI_ENDPOINT = 'https://newsapi.org/v2/top-headlines'
const NEWSAPI_API_KEY = process.env.NEWSAPI_API_KEY || "";

// create a menu
const menu = new MenuTemplate(() => 'News from Around the World')
const COUNTRYCODES = ['ae','ar','at','au','be','bg','br','ca','ch','cn','co','cu','cz','de','eg','fr','gb','gr','hk','hu','id','ie','il','in','it','jp','kr','lt','lv','ma','mx','my','ng','nl','no','nz','ph','pl','pt','ro','rs','ru','sa','se','sg','si','sk','th','tr','tw','ua','us','ve','za']

const astring = 'haha'
astring.trim().toLowerCase().toUpperCase()

for (let i = 0; i < COUNTRYCODES.length; i++) {
    const country = COUNTRYCODES[i];
    if (i % 6) {
        menu.interact(country.toUpperCase(), country, {
            do: ctx => ctx.answerCbQuery().then(() => true),
            joinLastRow: true
        })
    } else {
        menu.interact(country.toUpperCase(), country, {
            do: ctx => ctx.answerCbQuery().then(() => true)
        })
    }
}

const menuMiddleware = new MenuMiddleware('/', menu)

fetchNews = async (country, ctx) => {
    console.info('country: ', country)
    const url = withQuery(
        NEWSAPI_ENDPOINT,
        {
            country: country,
            pageSize: 5
        }
    )
    const headers = new fetch.Headers ({
        'X-Api-Key': NEWSAPI_API_KEY
    })

    try {
        console.info('headers: ', headers)
        const result = await fetch(url, {headers: headers})
        const newsArticles = await result.json()
        console.info(`result is: \n`, newsArticles)

        newsArticles.articles.map(article => {
            const img = article['urlToImage'] || {source: (__dirname + '/images/no_image.png')}
            const title = article['title']
            const description = article['description']
            // const url = article['url'] || 'no url'
            ctx.replyWithPhoto(img, {parse_mode: 'HTML', caption: `<b>${title}</b> ${description} `})
        })
    } catch (error) {
        console.error('Error: ', error)
    }
    return

}

// create a bot
const bot = new Telegraf(process.env.TELEGRAM_TOKEN)
// const IMAGE = 'link to image'

bot.catch((err, ctx) => {
    console.log(`Ooops, encountered an error for ${ctx.updateType}`, err)
  })

// when a user starts a session with your bot
bot.start(ctx => {
    // ctx.replyWithPhoto(IMAGE, {caption: `Hello, here's an orange for you`})
    ctx.reply(`Hey there! You're talking to the famous botdotbot_bot!`)
})

bot.hears('hi', ctx => ctx.reply('Hello!'))
bot.hears('hello', ctx => ctx.reply('Hello!'))

// bot.hears('orange', ctx => ctx.reply('The color or the fruit?'))
bot.hears('orange', ctx => ctx.replyWithPhoto({source: (__dirname + '/images/orange.jpg')}, {caption: 'You mean the fruit?'}))

bot.command('giphy', async (ctx) => {
    ctx.reply(`Fetching 5 GIPHYs! Please wait...`)
    // console.info('ctx: ', ctx)
    console.info('ctx.message: ', ctx.message)
    const length = ctx.message.entities[0].length
    const query = ctx.message.text.substring(length).trim()
    if (!query.length) {
        return ctx.reply('Please enter a search term')
    }
    console.info('query is: ', query)
    const url = withQuery(
        GIPHY_ENDPOINT,
        {
            q: query,
            api_key: GIPHY_API_KEY,
            limit: 5,
            offset: 0,
            rating: 'g',
            lang: 'en'
        }
    )
    try {
        const result = await fetch(url)
        const giphy = await result.json()
        // console.info(`result is: \n`, giphy)

        giphy.data.map(dataObj => {
            ctx.replyWithPhoto(dataObj.images.fixed_height.url, {caption: dataObj.title})
        })
    } catch (error) {
        console.error('Error: ', error)
    }
    return
})

bot.command('news', ctx => {
    const name = ctx.message.from.first_name
    // ctx.reply(`Haha, you are pranked! There's no news here for you!`)
    const length = ctx.message.entities[0].length
    const country = ctx.message.text.substring(length).trim()

    // display menu if no country is selected
    if (country.length <=0 || country.length >2) {
        ctx.reply(`Whoa there! I can't get your request. Choose one of these instead:`)
        return menuMiddleware.replyToContext(ctx)
    }
    return fetchNews(country, ctx)
})

bot.use((ctx, next) => {
    if (ctx.callbackQuery != null) {
        const country = ctx.callbackQuery.data.substring(1)
        console.info('callbackQuery: ', ctx.callbackQuery)
        return fetchNews(country, ctx)
    }
    next
})

// start the bot
console.info(`Starting bot at ${new Date()}`)
bot.launch()