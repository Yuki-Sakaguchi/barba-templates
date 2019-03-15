"usestric"

$(function () {
    /**
     * イベント
     */
    Barba.Dispatcher.on('linkClicked', function () {
        console.log('ユーザがPjaxのリンクをクリックした時')
    })
    
    Barba.Dispatcher.on('initStateChange', function () {
        console.log('リンクが変更された時')

        // GoogleAnalyticsはここに置くと良い
        // サイト内を移動していた場合
        if (Barba.HistoryManager.history.length >= -1) {
            // ga, gtagをそれぞれ送信
            if (typeof ga === 'function') ga('send', 'pageview', location.pathname)
            if (typeof gtag === 'function') gtag('config', '[トラッキングID]', { page_path: location.pathname })
        }
    })

    Barba.Dispatcher.on('newPageReady', function (currentStates, oldStatus, container, newPageRawHTML) {
        console.log('新しいコンテナがロードされ、ラッパーに挿入された時')

        // head内のmeta情報は自動では更新されないので、ここで自前で用意する
        var head = document.head
        var newPageRawHead = newPageRawHTML.match(/<head[^>]*>([\s\S.]*<\/head>)/i)[0]
        var newPageHead = document.createElement('head')
        newPageHead.innerHTML = newPageRawHead

        // タイトルは自動で変わるので、それ以外の変えてもよいmetaだけ定義
        var removeHeadTags = [
            "meta[name='keywords']",
            "meta[name='description']",
            "meta[property^='og']",
            "meta[name^='twitter']",
            "meta[itemprop]",
            "link[itemprop]",
            "link[rel='prev']",
            "link[rel='next']",
            "link[rel='canonical']"
        ].join(',')

        var headTags = head.querySelectorAll(removeHeadTags)
        for (var i = 0; i < headTags.length; i++) {
            head.removeChild(headTags[i])
        }
        
        var newHeadTags = newPageHead.querySelectorAll(removeHeadTags)
        for (var i = 0; i < newHeadTags.length; i++) {
            head.appendChild(newHeadTags[i])
        }
    })
    
    Barba.Dispatcher.on('transitionCompleted', function () {
        console.log('移行が完了し、古いコンテナがDOMから削除された時')
        
        // ページ表示後はスクロールさせる
        scroll()

        // aタグにcurrentクラスをつける
        setCurrentLink()
    })

    function scroll() {
        // ヘッダー追従かどうか
        var headerFixed = false
        if (location.hash) {
            // #がある場合
            var anchor = document.querySelector(location.hash)
            if (anchor) {
                var rect = anchor.getBoundingClientRect()
                var scrollTop = window.pageYOffset || document.documentElement.scrollTop
                if (headerFixed) {
                    var header = document.getElementById('header')
                    if (header) {
                        top = top - header.clientHeight
                    }
                }
                var top = rect.top + scrollTop
                window.scrollTo(0, top)
            } else {
                // アンカー先が存在しなければトップに
                window.scrollTo(0, 0)
            }
        } else {
            // #がなければトップに
            window.scrollTo(0, 0)
        }
    }

    function setCurrentLink () {
        var $a = $('a')
        var activeClass = 'js-current-link'
        $a.removeClass(activeClass)
        $a.each(function () {
            if (this.href.indexOf(location.protocol + '//' + location.host + location.pathname) === 0) {
                $(this).addClass(activeClass)
            }
        })
    }


    /**
     * Pjaxが動くかどうかのカスタマイズ
     * return falseをすればpjaxが動かない
     * 標準のpreventCheckではURLに「#」が含まれるアンカーリンクはすべてPjaxが無効になってしまいます。
     */
    Barba.Pjax.originalPreventCheck = Barba.Pjax.preventCheck
    Barba.Pjax.preventCheck = function (evt, element) {
        if (element) {
            // アンカーリンクであり、同一ページでなければ有効に
            var url = location.protocol + '//' + location.host + location.pathname
            var extractHash = element.href.replace(/#.*$/,"")
            if (element.href.indexOf(location.protocol + '//' + location.host) != -1) {
                if (element.href.indexOf('#') > -1 &&  extractHash != url ) {
                    return true
                }
            }
            // 外部リンクはtarget="_blank"に
            var domain = location.protocol + '//' + location.host
            if (element.href.indexOf(domain) !== 0) {
                element.setAttribute('target', '_blank')
                return false
            }
            // リソース系は別タブで開く
            if (/\.(xlsx?|docx?|pptx?|pdf|jpe?g|png|gif|svg)/.test(element.href.toLowerCase())) {
                element.setAttribute('target', '_blank')
                return false
            }
            // デフォルトのチェックを通す
            if (!Barba.Pjax.originalPreventCheck(evt, element)) {
                return false
            }
            // 該当のクラスが付いている場合はリンクを無効にする（デフォルトだと.no-barbaが無効）
            var ignoreClasses = ['pjax-link']
            for (var i = 0; i < ignoreClasses.length; i++) {
                if (element.classList.contains(ignoreClasses[i])) {
                    return false
                }
            }
            return true
        }
    }

    /**
     * 遷移アニメーション
     */
    var DefaultTransition = Barba.BaseTransition.extend({
        /**
         * ページのトランジション開始時に呼ばれるメソッド
         * ページが読み込まれたタイミングでloadOut()が実行され、それが終わればloadInに処理を移す
         */
        start: function () {
            console.log('PageTransition: start')
            var _this = this
            var _LoadOut = new Promise(function (resolve) { _this.loadOut(resolve) })
            Promise
                .all([this.newContainerLoading, _LoadOut])
                .then(this.loadIn.bind(this));
        },
    
        /**
         * ページが消えるアニメーション
         * 引数で渡されるresolve関数を実行するとloadIn関数へ処理が移る
         * this.oldContainerで更新前のDOMを参照できる
         */
        loadOut: function (resolve) {
            console.log('PageTransition: laodOut')
            anime({
                targets: this.oldContainer,
                opacity: [1, 0],
                duration: 500,
                easing: "easeInQuad",
                complete: function () {
                    resolve()
                }
            })
        },
    
        /**
         * ページが現れるアニメーション
         * this.oldContainerで更新前のDOMを参照できる
         * this.newContainerで更新後のDOMを参照できる
         * done()関数を実行すると終了
         */
        loadIn: function () {
            console.log('PageTransition: laodIn')
            var _this = this
            $(_this.oldContainer).hide() // 元からあるものを非表示に
            $(this.newContainer).css({ // 新しいものを透明で配置
                visibility: 'visible',
                opacity: '0',
            })
            anime({
                targets: this.newContainer,
                opacity: [0, 1],
                duration: 500,
                easing: "easeInQuad",
                complete: function () {
                    _this.done()
                }
            })
        }
    })

    /**
     * 遷移用のトランジションを複数用意する
     */
    var SlideTransition = Barba.BaseTransition.extend({
        start: function () {
            console.log('SlideTransition: start')
            var _this = this
            var _LoadOut = new Promise(function (resolve) { _this.loadOut(resolve) })
            Promise
                .all([this.newContainerLoading, _LoadOut])
                .then(this.loadIn.bind(this));
        },
        loadOut: function (resolve) {
            console.log('SlideTransition: laodOut')
            anime({
                targets: this.oldContainer,
                opacity: [1, 0],
                translateX: [0, 20],
                duration: 500,
                easing: "easeInQuad",
                complete: function () {
                    resolve()
                }
            })
        },
        loadIn: function () {
            console.log('SlideTransition: laodIn')
            var _this = this
            $(this.oldContainer).hide() // 元からあるものを非表示に
            $(this.newContainer).css({ // 新しいものを透明で配置
                visibility: 'visible',
                opacity: '0',
                transform: 'translateX(20px)'
            })
            anime({
                targets: this.newContainer,
                opacity: [0, 1],
                translateX: [20, 0],
                duration: 500,
                easing: "easeInQuad",
                complete: function () {
                    _this.done()
                }
            })
        }
    })
    
    /**
     * namespaceに応じて使うtransitionを変える
     */
    Barba.Pjax.getTransition = function () {
        var namespace = Barba.HistoryManager.prevStatus().namespace
        if (namespace) {
            if (namespace.indexOf('slide') >= 0) {
                return SlideTransition
            }
        }
        return DefaultTransition // namespaceがなければデフォルトの遷移
    }
    
    Barba.BaseView.init() // transitioアニメーションを有効に


    /**
     * 実行
     */
    Barba.Prefetch.init() // リンク先のPreFetcchを有効に
    Barba.Pjax.start() // これを書けば非同期遷移になる
})
