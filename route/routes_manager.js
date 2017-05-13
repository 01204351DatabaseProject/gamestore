var mysql = require('mysql');
var connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gamestore_database'
});

module.exports = (app, passport) => {
  /////////////////////
  // utility methods //
  /////////////////////
  setCookies = (req, res) => {
    res.cookie('store_id', req.cookies.store_id)
    res.cookie('user_id', req.cookies.user_id)
  }
  clearCookies = (res) => {
    res.clearCookie('store_id')
    res.clearCookie('user_id')
    res.clearCookie('search')
    res.clearCookie('sort_by')
  }
  signIn = (req, res) => {
    connection.query('SELECT store_id FROM stores WHERE country = ?', [req.user.country], (err, result) => {
      res.cookie('store_id', result[0].store_id)
      res.cookie('user_id', req.user.user_id)
      res.redirect('/featured')
    })
  }
  searchGames = (req, res, sql, page, username=null) => {
    setCookies(req, res)
    var params = [req.cookies.store_id, req.cookies.user_id]
    if (req.query.search || req.cookies.search && req.cookies.search != '') {
      if (req.query.search != '') {
        if (req.query.search && req.query.search != req.cookies.search || !req.cookies.search) {
          res.cookie('search', req.query.search)
        }
        sql += ' AND name LIKE ?'
        params.push('%' + ((req.query.search) ? req.query.search : req.cookies.search) + '%')
      } else {
        res.clearCookie('search')
      }
    }
    if (req.cookies.sort_by && req.cookies.sort_by != 'number') {
      sql += ' ORDER BY ' + req.cookies.sort_by
    }
    connection.query(sql, params, (err, result) => {
      res.render(page, { user_id: req.cookies.user_id, games: result, search: (req.query.search) ? req.query.search : ((req.query.search == '') ?  '' : req.cookies.search), username: username })
    })
  }
  sortBy = (req, res, route) => {
    res.cookie('sort_by', req.params.by)
    res.redirect(route)
  }
  ////////////////
  // home route //
  ////////////////
  app.get('/', (req, res) => {
    clearCookies(res)
    res.render('index.ejs')
  })
  //////////////////
  // signin route //
  //////////////////
  app.post('/signin', passport.authenticate('signin', {
    failureRedirect: '/',
    failureFlash: true
  }), signIn)
  //////////////////
  // signup route //
  //////////////////
  app.post('/signup', passport.authenticate('signup', {
    failureRedirect: '/',
    failureFlash: true
  }), signIn)
  ////////////////////
  // featured route //
  ////////////////////
  app.get('/featured', (req, res) => {
    searchGames(req, res, 'SELECT * FROM games WHERE review = 5 AND except_country NOT IN (SELECT country FROM stores WHERE store_id = ?) AND game_id NOT IN (SELECT game_id FROM orders WHERE user_id = ?)', 'featured.ejs')
  })
  /////////////////
  // store route //
  /////////////////
  app.get('/store', (req, res) => {
    searchGames(req, res, 'SELECT * FROM games WHERE except_country NOT IN (SELECT country FROM stores WHERE store_id = ?) AND game_id NOT IN (SELECT game_id FROM orders WHERE user_id = ?)', 'store.ejs')
  })
  ///////////////////
  // library route //
  ///////////////////
  app.get('/library', (req, res) => {
    connection.query('SELECT username FROM users WHERE user_id = ?', [req.cookies.user_id], (err, result) => {
      searchGames(req, res, 'SELECT games.* FROM games LEFT JOIN orders ON games.game_id = orders.game_id WHERE orders.user_id = ? AND games.game_id = orders.game_id', 'library.ejs', result[0].username)
    })
  })
  ////////////////////
  // wishlist route //
  ////////////////////
  app.get('/wishlist', (req, res) => {
    searchGames(req, res, 'SELECT games.* FROM games LEFT JOIN orders ON games.game_id = wishlist.game_id WHERE wishlist.user_id = ? AND games.game_id = wishlist.game_id', 'wishlist.ejs')
  })
  ///////////////////
  // profile route //
  ///////////////////
  app.get('/profile', (req, res) => {
    setCookies(req, res)
    connection.query('SELECT * FROM users WHERE user_id = ?', [req.cookies.user_id], (err, result) => {
      res.render('profile.ejs', { user: result[0] })
    })
  })
  ////////////////
  // game route //
  ////////////////
  app.get('/store/:game_id', (req, res) => {
    setCookies(req, res)
    connection.query('SELECT * FROM games WHERE game_id = ?', [req.params.game_id], (err, result) => {
      res.render('game.ejs', { user_id: req.cookies.user_id, game: result[0] })
    })
  })
  ////////////////////
  // utility routes //
  ////////////////////
  app.get('/featured/sort/:by', (req, res) => {
    sortBy(req, res, '/featured')
  })
  app.get('/store/sort/:by', (req, res) => {
    sortBy(req, res, '/store')
  })
  app.get('/library/sort/:by', (req, res) => {
    sortBy(req, res, '/library')
  })
  app.get('/wishlist/sort/:by', (req, res) => {
    sortBy(req, res, '/wishlist')
  })
}
