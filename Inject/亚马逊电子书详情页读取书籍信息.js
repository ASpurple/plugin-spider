(function(){

    var data = ""
    var title = document.querySelector("#productTitle")
    if(title){
        data += "[[" + title.innerHTML + "]]"
    }

    var auths = document.querySelectorAll(".author")
    if (auths){
        var a = ""
        for(var k=0; k<auths.length; k++){
            if(auths[k].innerText.trim() == ""){
                continue
            }
            a += auths[k].innerText
        }
        data+="[[" + a + "]]"
    }

    var img = document.querySelector("#ebooksImgBlkFront")
    if(img){
        data += "[[" + img.src + "]]"
    }

    var fm = document.querySelector("#bookDesc_iframe")
    if (fm){
        var cw = fm.contentWindow
        var content = cw.document.getElementById("iframeContent")
        if(content){
            data += "[[" + content.innerHTML.toString() + "]]"
            data += "[[" + content.innerText.substring(0, 60) + "]]"
        }
    }

    var lo = localStorage.getItem("links")
    if(!lo){
        return
    }
    var js = JSON.parse(lo)
    if(!js){
       return
    }
    var arr = js.arr
    if (!arr){
        return
    }
    var i = localStorage.getItem("index")
    if (!i){
        i = 0
    }else{
        i = parseInt(i)
    }
    localStorage.setItem("index", i+1)
    if(i < arr.length){
        send(data, arr[i+1])
    }else{
        send(data, "")
    }
})()