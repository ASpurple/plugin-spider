// 动态执行JS文件
// chrome.tabs.executeScript(tabId, {file: 'some-script.js'});

// 桌面通知
function notice(msg){
    chrome.notifications.create(null, {
        type: 'basic',
        iconUrl: 'icon.png',
        title: "GET HTML",
        message: msg
    })
}



// 蓝奏云复制 Cookie
function lzyCookie(url){
    if(url.indexOf("woozooo.com") >= 0){
        getCurrentTabId(function(id){
            chrome.tabs.executeScript(id, {
                code: `
                var input=document.createElement("input")
                input.value=document.cookie
                input.style.position="fixed"
                input.style.right="100px"
                input.style.top="100px"
                input.style.width="200px"
                input.style.height="100px"
                input.style.cursor="pointer"
                input.onclick=function(){
                    input.select()
                    document.execCommand('copy')
                }
                document.body.appendChild(input)
                `
            })
        })
    }
}

// 要注入到页面的 JS 代码
var jscode = ""

// 每个注入的JS都会在注入时自动添加此函数，用以返回数据给后台
const ResponseScript = `
    function send(msg, nextURL){
        var data = {data: msg, next: nextURL}
        chrome.runtime.sendMessage(data, function(response) {
            console.log('收到 background 的回复：' + response)
        })
    };
`
// 执行脚本的 tab ID
var curID = -1

// 需要跳转的下一条URL，由被注入的jscode发送过来
var nextURL = ""

// 监听页面加载
chrome.tabs.onUpdated.addListener(function (id, info, tab) {
    // 复制蓝奏云 Cookie
    if(info.status === 'complete'){
        lzyCookie(tab.url)
    }
    // 根据已注入脚本的请求再次注入自定义脚本
    if(id!=curID || tab.url != nextURL){return}
    if (info.status === 'complete') {
        exec(jscode)
    }
})

// 监听来自已注入JS发来的消息
chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse){
    if(msg.next == ""){
        nextURL = ""
        curID = -1
    }
    fetch("http://localhost:9200/data", {
        method: "POST",
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: msg.data
    }).then(function(res){
        res.text().then(data => {
            if (msg.next != ""){
                // 若脚本传回 nextURL 为 非空字符串，则跳转到nextURL并注入 jscode
                nextURL = msg.next
                exec("window.location.href = `" + msg.next + "`")
            }
        })
    }).catch(err => {
        nextURL = ""
        curID = -1
        notice("插件服务器已关闭，插件已停止")
    })
	sendResponse("_")
})

// 右键菜单
chrome.contextMenus.create({
	title: "注入脚本",
	onclick: function(){
        getCurrentTabId(function(id){
            if(id == null){
                notice("未获取到 TAB ID")
                return
            }
            curID = id
            nextURL = ""
            fetch("http://localhost:9200/js", {method:"GET"}).then(res => {
                res.text().then(data => {
                    if(data == "-1"){
                        notice("未获取到脚本文件，请确认js.js文件已放置在桌面")
                        return
                    }
                    if(data == ""){
                        notice("脚本是空的，请编写要注入的脚本")
                        return
                    }
                    jscode = ResponseScript + data
                    exec(jscode)
                })
            }).catch(e => {
                notice("连接插件服务失败，请确认插件服务已开启")
            })
        })
    }
})

// 动态注入JS代码
function exec(code, callback){
    if(curID == -1){
        return
    }
    if (callback){
        chrome.tabs.executeScript(curID, {code: code}, callback)
    }else{
        chrome.tabs.executeScript(curID, {code: code})
    }
}

// 获取当前标签页ID，注入JS时需先执行此步骤
function getCurrentTabId(callback){
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
		if(callback) callback(tabs.length ? tabs[0].id: null)
	})
}