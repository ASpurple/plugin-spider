package main

import (
	"crypto/md5"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"
)

// 存放已有数据的MD5，比对去重
var fmp = make(map[string]int)

// 工作目录的上级目录
var wd = ""

// 已获取数据存放目录
var dataDir = ""

// JS 脚本文件存放目录
var jsDir = ""

// 本次要执行的 js 文件
var curjs = ""

// 脚本文件夹文件列表
var jsList []string

func main() {
	w, err := os.Getwd()
	if err != nil {
		panic(err)
	}
	wd = filepath.Dir(w)
	dataDir = filepath.Join(wd, "DATA")
	jsDir = filepath.Join(wd, "Inject")
	err1 := os.MkdirAll(dataDir, os.ModePerm)
	err2 := os.MkdirAll(jsDir, os.ModePerm)
	if err1 != nil || err2 != nil {
		panic(err)
	}
	if !in() {
		return
	}
	Ser()
}

// 接收输入的文件名
func in() bool {
	fs, err := ioutil.ReadDir(jsDir)
	if err != nil {
		fmt.Println(err)
		return false
	}
	if len(fs) == 0 {
		fmt.Println("\n没有JS文件，请先添加")
		return false
	}
	fmt.Println("\n请选择本次需注入的JS脚本: ")
	for i, f := range fs {
		fmt.Println("\n" + strconv.Itoa(i+1) + ": " + f.Name())
		jsList = append(jsList, f.Name())
	}
	for {
		name := ""
		fmt.Scan(&name)
		index, err := strconv.Atoi(name)
		if err != nil {
			fmt.Println("\n请输入正确的序号！")
			continue
		}
		index--
		if index < 0 || index >= len(jsList) {
			fmt.Println("\n请输入正确的序号！")
			continue
		}
		curjs = jsList[index]
		break
	}
	return true
}

// Ser 监听浏览器插件的HTTP请求，接收数据
func Ser() {
	scan()
	fmt.Println("\n数据文件夹去重扫描完成")
	hs := http.Server{}
	hs.Addr = "0.0.0.0:9200"
	mux := http.NewServeMux()
	mux.HandleFunc("/data", dataHandler)
	mux.HandleFunc("/js", sendScript)
	fmt.Println("\n开始监听本机9200端口，插件数据将发送至 http://localhost:9200/data 接口")
	fmt.Println("\n请将需要注入的JS脚本放在: " + jsDir)
	fmt.Println("\n插件获取的文件将存放在: " + dataDir)
	hs.Handler = mux
	hs.ListenAndServe()
}

func dataHandler(res http.ResponseWriter, req *http.Request) {
	defer req.Body.Close()
	buf := readData(req)
	writeFile(buf)
	res.Write([]byte("1"))
}

func readData(req *http.Request) (res []byte) {
	cl := req.Header.Get("content-length")
	le, err := strconv.Atoi(cl)
	if err != nil {
		return
	}
	sum := 0
	for {
		buf := make([]byte, 128)
		n, err := req.Body.Read(buf)
		if err != nil {
			sum = le
		}
		sum += n
		res = append(res, buf[:n]...)
		if sum >= le {
			break
		}
	}
	return
}

func sendScript(res http.ResponseWriter, req *http.Request) {
	path := filepath.Join(jsDir, curjs)
	js, err := os.Open(path)
	if err != nil {
		res.Write([]byte("-1"))
		return
	}
	defer js.Close()
	buf, err := ioutil.ReadAll(js)
	if err != nil {
		fmt.Println(err)
		res.Write([]byte("-1"))
		return
	}
	res.Write(buf)
}

func md(buf []byte) string {
	if len(buf) == 0 {
		return ""
	}
	return fmt.Sprintf("%x", md5.Sum(buf))
}

func has(buf []byte) bool {
	m := md(buf)
	_, ok := fmp[m]
	return ok
}

// 服务启动时对扫描已存在文件，读取并去重
func scan() {
	p := dataDir
	_, err := os.Stat(p)
	if err != nil {
		os.MkdirAll(p, os.ModePerm)
		return
	}
	fs, err := ioutil.ReadDir(p)
	if err != nil {
		panic(err)
	}
	for _, file := range fs {
		if file.IsDir() {
			continue
		}
		ps := filepath.Join(p, file.Name())
		f, err := os.Open(ps)
		if err != nil {
			fmt.Println(err)
			continue
		}
		buf, err := ioutil.ReadAll(f)
		f.Close()
		if err != nil {
			fmt.Println(err)
			continue
		}
		k := md(buf)
		_, ok := fmp[k]
		if ok {
			os.Remove(ps)
			continue
		}
		fmp[k] = 1
	}
}

func writeFile(buf []byte) {
	if len(buf) == 0 {
		return
	}
	k := md(buf)
	_, ok := fmp[k]
	if ok {
		return
	}
	t := time.Now().UnixNano()
	name := strconv.FormatInt(t, 10)
	dir := dataDir
	path := filepath.Join(dir, name+".txt")
	err := os.MkdirAll(dir, os.ModePerm)
	if err != nil {
		fmt.Println(err)
		return
	}
	file, err := os.Create(path)
	if err != nil {
		fmt.Println(err)
		return
	}
	defer file.Close()
	file.Write(buf)
	fmp[md(buf)] = 1
}
