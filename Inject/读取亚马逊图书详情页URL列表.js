(function(){
    document.title = "✔"
    var wrap = document.querySelector(".s-main-slot")
    var arr = wrap.querySelectorAll(".s-include-content-margin")
    var data = ""
    for(let i=0; i<arr.length; i++){
        var box = arr[i]
        var a = box.querySelector(".a-link-normal")
        if (a){
            data += a.href + "\n"
        }
    }
    var last = document.querySelector(".a-last")
    if (last){
        var ls = last.querySelector("a")
        if (ls){
            ls.click()
        }
    }
    send(data, true)
})()