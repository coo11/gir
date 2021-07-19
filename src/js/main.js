import "./fileinput.mod";
import Rusha from "rusha";

const debug = false;
function logWarn() {
  if (debug || window.debug)
    return Function.apply.call(console.warn, console, arguments);
}
const template = () => {
  return { allBranchesInfo: [], extra: {} };
};
const theWorld = {
  staging: template(),
  config: JSON.parse(localStorage.getItem("settings")) || template(),
  status: "normal",
  set mode(type) {
    switch (type) {
      case "edit":
        if (this.status === "edit") this.staging = template();
        this.config = this.staging;
        break;
      case "cancel":
        type = "normal";
      case "suspend":
        this.staging = type === "suspend" ? this.config : template();
        this.config =
          JSON.parse(localStorage.getItem("settings")) || template();
        break;
      case "save":
        type = "normal";
        localStorage.setItem("settings", JSON.stringify(this.config));
        this.staging = template();
        break;
    }
    this.status = type;
  },
  /**
   * Structure:
   * {
   *   token: {String},
   *   userInfo: {request from API},
   *   reposInfo: [an array info via repos API request],
   *   allBranchesInfo: { '0': [repos[0]'s all branches], '1': [repos[1]'s all branches], ... },
   *   repo: { index: {repo index selected by user}, info: { repos[index] }, branches: [repo's all branches info in an array] },
   *   branch: { index: {branch index selected by user in current selected repo}, info: { allBranches[repo index][index] } },
   *   extra: {
   *     customName: {Boolean},
   *     nameRule: {String},
   *     customPath: {Boolean},
   *     pathRules: {String}
   *   }
   * }
   */
  get token() {
    return this.config.token;
  },
  get userInfo() {
    return this.config.userInfo;
  },
  get reposInfo() {
    return this.config.reposInfo;
  },
  get allBranchesInfo() {
    return this.config.allBranchesInfo;
  },
  get repo() {
    return this.config.repo;
  },
  get branch() {
    return this.config.branch;
  },
  get displayName() {
    return this.userInfo.name || this.userInfo.login;
  },
  get canSave() {
    return this.tInput.val() && $("#selectRepo").val();
  },
  setAvatar() {
    if (this.token) {
      $("#avatar")
        .attr(
          "href",
          this.repo ? this.repo.info.html_url : this.userInfo.html_url
        )
        .find("img")
        .attr("src", `${this.userInfo.avatar_url}&s=32`);
    } else {
      $("#avatar")
        .attr("href", "https://github.com")
        .find("img")
        .attr(
          "src",
          'data:image/svg+xml;utf8,<svg height="32" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="32"><path fill="white" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>'
        );
    }
  },
  tInput: $("#tokenInput"),
  setAuthTip(errCode) {
    if (errCode) {
      const msg =
        errCode === 401
          ? "Bad credentials. Please check your token."
          : errCode === 909
          ? "Please input token."
          : "Request failure. Please submit again.";
      this.tInput.siblings(".invalid-feedback").text(msg);
      this.tInput.addClass("is-invalid").removeClass("is-valid");
    } else {
      this.tInput
        .siblings(".valid-feedback")
        .html(`Hello <var>${this.displayName}</var>, you have authorized.`);
      this.tInput.addClass("is-valid").removeClass("is-invalid");
    }
  },
  setOptions(id, data, value) {
    if (id === "#selectRepo") {
      $(`${id} option:not([value=''])`).remove();
      $(id)
        .append(
          data
            .map(
              (repo, index) => `<option value='${index}'>${repo.name}</option>`
            )
            .join("")
        )
        .removeAttr("disabled");
      if (value) $(id).val(value);
      else $(id).val("");
      $(id).removeAttr("disabled");
    } else {
      /* id = '#selectBranch' */
      $(id).empty();
      if (data.length === 0) {
        $(id).append(`<option value='0' selected disabled>master</option>`);
      } else if (data.length === 1) {
        $(id).append(
          `<option value='0' selected disabled>${data[0].name}</option>`
        );
        $(id).removeAttr("disabled");
      } else {
        $(id).append(
          data
            .map((branch, index) => {
              if (index == value)
                return `<option value='${index}' selected>${branch.name}</option>`;
              else return `<option value='${index}'>${branch.name}</option>`;
            })
            .join("")
        );
        $(id).removeAttr("disabled");
      }
    }
  },
  saveExtra() {
    ["customName", "customPath"].forEach(id => {
      const e = $(`#${id}`);
      this.config.extra[id] = e.prop("checked");
      let inputId = e.attr("aria-controls"),
        input = $(`#${inputId}Input`),
        value = input
          .val()
          .replaceAll("\\", "/")
          .replace(/^[\/\s]*([\s\S]*?)[\/\s]*$/, "$1");
      if (id === "customName") {
        value = value.replaceAll(/[\\/:*?""<>|]/g, "").trim();
      }
      input.val(value);
      this.config.extra[inputId] = value;
    });
  },
  initModal() {
    if (this.token) {
      if (this.status === "edit") {
        this.setOptions("#selectRepo", this.reposInfo);
        this.setOptions("#selectBranch", []);
        $("#customName").prop("checked", false);
        $("#nameRule").removeClass("show").find("input").val("");
        $("#customPath").prop("checked", false);
        $("#pathRule").removeClass("show").find("input").val("");
      } else {
        this.tInput.val(this.token);
        this.setAuthTip();
        $("#configRepo").collapse("show");
        const index = this.repo.index;
        this.setOptions("#selectRepo", this.reposInfo, index);
        this.setOptions(
          "#selectBranch",
          this.allBranchesInfo[index] || [],
          this.branch.index
        );
        if (this.config.extra.customName) {
          $("#customName").prop("checked", true);
          $("#nameRule")
            .addClass("show")
            .find("input")
            .val(this.config.extra.nameRule || "");
        }
        if (this.config.extra.customPath) {
          $("#customPath").prop("checked", true);
          $("#pathRule")
            .addClass("show")
            .find("input")
            .val(this.config.extra.pathRule || "");
        }
      }
    } else {
      this.tInput.val("").removeClass("is-invalid is-valid");
      $("#configRepo").collapse("hide");
    }
  },
  req({ method = "GET", path, token = this.token }) {
    return $.ajax({
      url: `https://api.github.com/${path}`,
      type: method,
      headers: { Authorization: `token ${token}` },
      contentType: "application/json;charset=UTF-8",
    });
  },
  getBasicInfo(handler) {
    this.mode = "edit";
    const token = this.tInput.val();
    this.req({ path: `user`, token })
      .done(res => {
        this.config.token = token;
        this.config.userInfo = res;
        this.req({ path: `user/repos` })
          .done(res => {
            this.config.reposInfo = res;
            this.setAuthTip();
            handler(true);
          })
          .fail(res => {
            this.setAuthTip(res.status) && handler(false);
          });
      })
      .fail(res => {
        this.setAuthTip(res.status) && handler(false);
      });
  },
  init() {
    const self = this;
    $("#configModal")
      .on("show.bs.modal", function (event) {
        if (self.status === "suspend") {
          self.mode = "edit";
        }
      })
      .on("hide.bs.modal", function (event) {
        if (self.status === "edit") {
          self.mode = "suspend";
          if (self.tInput.hasClass("is-invalid")) {
            self.mode = "cancel";
            self.initModal();
          }
        }
        buildUp.input.fileinput(buildUp.config.token ? "enable" : "disable");
      })
      .on("show.bs.collapse", function (event) {
        const id = event.target.id;
        if (id === "configRepo") {
          //self.setOptions("#selectRepo", self.reposInfo);
          $("#saveButton")
            .text("Save")
            .attr("form", "validateInfo")
            .attr("disabled", true);
        } else {
          const name = $(`[aria-controls=${id}]`).attr("id");
          self.config.extra[name] = true;
          self.config.extra[id] = $(`#${id}Input`).val();
          self.canSave && $("#saveButton").removeAttr("disabled");
        }
      })
      .on("hide.bs.collapse", function (event) {
        const id = event.target.id;
        if (id === "configRepo") {
          $("#saveButton")
            .text("Validate")
            .attr("form", "validateToken")
            .attr("disabled", true);
        } else {
          const name = $(`[aria-controls=${id}]`).attr("id");
          self.config.extra[name] = false;
          self.canSave && $("#saveButton").removeAttr("disabled");
        }
      });

    $("#validateToken").submit(function (event) {
      event.preventDefault();
      const token = self.tInput.val();
      $("#configRepo").collapse("hide");
      $("#saveButton").attr("disabled", true);
      if (token) {
        self.getBasicInfo(function (success) {
          if (success) {
            self.setAvatar();
            self.initModal();
            $("#configRepo").collapse("show");
          } else {
            $("#configRepo").collapse("hide");
          }
        });
      } else {
        self.setAuthTip(909);
      }
    });

    this.tInput.on("input", function (event) {
      $(this).removeClass("is-invalid is-valid");
      $("#saveButton")
        .text("Validate")
        .attr("form", "validateToken")
        .removeAttr("disabled");
    });

    $("#validateInfo").submit(function (event) {
      event.preventDefault();
      self.saveExtra();
      self.mode = "save";
      $("#configModal").modal("hide");
      $("#saveButton").attr("disabled", true);
      buildUp.reset();
    });

    $("#selectRepo").change(function (event) {
      const index = $(this).val(),
        branches = self.allBranchesInfo[index];
      $("#selectBranch").attr("disabled", true);
      $("#saveButton").attr("disabled", true);
      self.config.repo = { index, info: self.reposInfo[index] };
      if (!self.branch || !branches) {
        self
          .req({
            path: `repos/${self.userInfo.login}/${self.reposInfo[index].name}/branches`,
          })
          .done(function (res) {
            let defaultBranch = self.repo.info.default_branch,
              defaultIndex = res.findIndex(i => i.name === defaultBranch);
            if (defaultIndex === -1) {
              res = [{ name: defaultBranch }];
              defaultIndex = 0;
            }
            self.config.branch = {
              index: defaultIndex,
              info: res[defaultIndex],
            };
            self.config.allBranchesInfo[index] = res;
            self.config.repo.branches = res;
            self.setOptions("#selectBranch", res, defaultIndex);
            $("#saveButton").removeAttr("disabled");
          })
          .fail(function (res) {
            let info = { name: self.repo.info.default_branch };
            self.config.branch = { index: 0, info };
            self.config.allBranchesInfo[index] = [info];
            self.setOptions("#selectBranch", [info], "0");
            $("#saveButton").removeAttr("disabled");
          });
      } else if (branches) {
        const defaultIndex = branches.findIndex(
          i => i.name === self.repo.info.default_branch
        );
        self.config.branch = {
          index: defaultIndex,
          info: branches[defaultIndex],
        };
        self.config.repo.branches = branches;
        self.setOptions("#selectBranch", branches, defaultIndex);
        $("#saveButton").removeAttr("disabled");
      }
    });

    $("#selectBranch").change(function (event) {
      const index = $(this).val();
      self.config.branch = { index, info: self.repo.branches[index] };
    });

    $("#nameRuleInput").on("input", function (event) {
      self.canSave && $("#saveButton").removeAttr("disabled");
    });
    $("#pathRuleInput").on("input", function (event) {
      self.canSave && $("#saveButton").removeAttr("disabled");
    });

    $("#resetButton").click(function (event) {
      logWarn("=====Data Cleared=====");
      event.preventDefault();
      $("#configRepo").modal("hide");
      localStorage.removeItem("settings");
      self.mode = "cancel";
      self.setAvatar();
      self.initModal();
      buildUp.reset();
    });

    this.setAvatar();
    this.initModal();
  },
};

const buildUp = {
  get config() {
    return theWorld.config;
  },
  get isUseCdn() {
    return $("#isUseCDN").prop("checked");
  },
  input: $("input#file"),
  /**
   * srcInfo = {
   *   fileId: {
   *     hash: sha1 or md5 calculated after file batch selected.
   *     ext: get the real via Blob API at the same time.
   *     base64: Remove duplicate file and get blob Base64.
   *     blobInfo: After single file uploaded.
   *     isCommitted: false.
   *     }
   * }
   */
  srcInfo: new Map(),
  branchShaObtained: false,
  blobsCreated: false,
  uploadInfo: { blobItems: [] },
  getExtByHeader(hex) {
    let type;
    switch (hex) {
      case "89504e47":
        type = "image/png";
        break;
      case "47494638":
        type = "image/gif";
        break;
      case "ffd8ffe0":
      case "ffd8ffe1":
      case "ffd8ffe2":
      case "ffd8ffe3":
      case "ffd8ffe8":
        type = "image/jpeg";
        break;
      case "52494646":
        type = "image/webp";
        break;
      case "3c3f786d":
      case "3c737667":
        type = "image/svg+xml";
        break;
      default:
        if (hex.startsWith("424d")) type = "image/bmp";
        type = "/";
        break;
    }
    return type;
  },
  getExt(mimeType) {
    mimeType = mimeType.toLowerCase();
    if (mimeType == "image/svg+xml") return "svg";
    else if (mimeType == "image/jpeg") return "jpg";
    return mimeType.split("/")[1];
  },
  parsePath(fileId) {
    let blob = this.input.fileinput("getFileStack")[fileId].file,
      shownExt = this.getExt(blob.type),
      date = new Date(),
      nameToParse = this.config.extra.nameRule,
      pathToParse = this.config.extra.pathRule,
      info = this.srcInfo.get(fileId),
      ext = info.ext || shownExt,
      o = {
        /* prettier-ignore */
        name: blob.name.replace(new RegExp(`\.${shownExt == "jpg" ? "(jpg|jpeg)" : shownExt}$`, 'i'), ""),
        sha1: info.hash,
        yyyy: date.getFullYear(),
        MM: date.getMonth() + 1,
        dd: date.getDate(),
        mm: date.getMinutes(),
        ss: date.getSeconds(),
        ts13: date.getTime(),
        ts10: Math.round(date.getTime() / 1000),
        /* prettier-ignore */
        UUID: (function() {//https://stackoverflow.com/a/21963136/14168341
          var self = {};
          var lut = []; for (var i=0; i<256; i++) { lut[i] = (i<16?'0':'')+(i).toString(16); }
          self.generate = function() {
            var d0 = Math.random()*0xffffffff|0;
            var d1 = Math.random()*0xffffffff|0;
            var d2 = Math.random()*0xffffffff|0;
            var d3 = Math.random()*0xffffffff|0;
            return lut[d0&0xff]+lut[d0>>8&0xff]+lut[d0>>16&0xff]+lut[d0>>24&0xff]+'-'+
              lut[d1&0xff]+lut[d1>>8&0xff]+'-'+lut[d1>>16&0x0f|0x40]+lut[d1>>24&0xff]+'-'+
              lut[d2&0x3f|0x80]+lut[d2>>8&0xff]+'-'+lut[d2>>16&0xff]+lut[d2>>24&0xff]+
              lut[d3&0xff]+lut[d3>>8&0xff]+lut[d3>>16&0xff]+lut[d3>>24&0xff];
          }
          return self;
        })(),
      };
    for (let i in o) {
      let j = o[i].toString();
      if (i !== "name" && j.length === 1) {
        j = "0" + j;
      }
      pathToParse = pathToParse.replaceAll(`{${i}}`, j);
      nameToParse = nameToParse.replaceAll(`{${i}}`, j);
    }
    if (!this.config.extra.customName) nameToParse = o.name;
    if (!this.config.extra.customPath) pathToParse = "";
    return `${pathToParse}/${nameToParse}.${ext}`;
  },
  calcHash(file) {
    let blobSlice =
        File.prototype.slice ||
        File.prototype.mozSlice ||
        File.prototype.webkitSlice,
      chunkSize = 2097152,
      chunks = Math.ceil(file.size / chunkSize),
      currentChunk = 0,
      hexHash = Rusha.createHash(),
      fileReader = new FileReader();
    return new Promise((resolve, reject) => {
      let ext;
      fileReader.onload = e => {
        hexHash.update(e.target.result);
        if (currentChunk === 0) {
          let arr = new Uint8Array(e.target.result).subarray(0, 4),
            header = "";
          for (let i = 0; i < arr.length; i++) {
            header += arr[i].toString(16);
          }
          const mimeType = this.getExtByHeader(header);
          ext = this.getExt(mimeType);
        }
        currentChunk++;
        if (currentChunk < chunks) loadNext();
        else {
          const hash = hexHash.digest("hex");
          resolve({ ext, hash });
        }
      };
      fileReader.onerror = () => {
        reject("oops, something went wrong while calculating hash.");
      };
      loadNext();
      function loadNext() {
        let start = currentChunk * chunkSize,
          end = start + chunkSize >= file.size ? file.size : start + chunkSize;
        fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
      }
    });
  },
  calcBase64(blob) {
    let reader = new FileReader();
    reader.readAsDataURL(blob);
    return new Promise(resolve => {
      reader.onloadend = () => resolve(reader.result.split(",")[1]);
    });
  },
  initConfig() {
    let self = this;
    this.input.fileinput({
      uploadUrl: "https://api.github.com/repos/user/repo/git/blobs",
      beforeAjaxEnqueue: (fileId, settings) => {
        const body = {
          content: self.srcInfo.get(fileId).base64,
          encoding: "base64",
        };
        settings.url = `https://api.github.com/repos/${self.config.repo.info.full_name}/git/blobs`;
        settings.data = JSON.stringify(body);
        settings.contentType = "application/json;charset=UTF-8";
        settings.headers = { Authorization: `token ${self.config.token}` };
        return settings;
      },
      /* prettier-ignore */
      allowedFileExtensions: ["svg", "jpeg", "jpg", "png", "gif", "bmp", "webp"],
      overwriteInitial: false,
      progressUploadThreshold: 88,
      previewFileType: "image",
      maxFileSize: "10240",
      maxFileCount: "10",
      maxAjaxThreads: 2,
      autoOrientImage: false,
      fileActionSettings: {
        showRemove: true,
        showUpload: false,
        showZoom: true,
        showDrag: true,
      },
      browseClass: "btn btn-success",
      browseLabel: "Select Image(s)",
      removeClass: "btn btn-danger",
      removeLabel: "Clear",
      uploadClass: "btn btn-info",
      uploadLabel: "Upload",
      dropZoneTitle:
        "Drag & drop files here ...<br>or<br>Copy & paste screenshots here ...",
    });
  },
  srcInfoDel(isAll, soft = true) {
    if (!isAll /** just remove single file info */) {
      let id = this.srcInfoDel.fileId,
        info = this.srcInfo.get(id);
      if (info.isCommitted && soft) {
        delete info.base64;
      } else this.srcInfo.delete(id);
      this.srcInfoDel.fileId = null;
    } else if (!soft) this.srcInfo.clear();
    /** clear all file info ↑↓ */ else {
      this.srcInfo.forEach((v, k) => {
        v.isCommitted
          ? delete this.srcInfo.get(k).base64
          : this.srcInfo.delete(k);
      });
    }
  },
  openFileDelModal(isAll = false) {
    const el = $("#srcInfoDelModal");
    if (!isAll) {
      el.addClass("remove-src").removeClass("clear-src");
      el.find(".modal-title span").text("Remove");
      el.find(".modal-body span").text("remove its");
    } else {
      el.addClass("clear-src").removeClass("remove-src");
      el.find(".modal-title span").text("Clear");
      el.find(".modal-body span").text("clear all");
    }
    el.modal("show");
  },
  initFileEvents() {
    let self = this;
    this.input
      .on("filebatchselected", async () => {
        logWarn("added");
        self.input.fileinput("disable");
        const files = self.input.fileinput("getFileStack");
        for (let i in files) {
          if (self.srcInfo.has(i)) continue;
          else {
            let info = await self.calcHash(files[i].file);
            self.srcInfo.set(i, info);
          }
        }
        const test = {},
          duplicatedFileNames = [];
        self.srcInfo.forEach(async (v, k) => {
          const hash = v.hash;
          if (hash in test) {
            // MIH 08 Related
            const frame = $(`[data-fileid="${k}"]`);
            duplicatedFileNames.push(files[k].name);
            self.input.fileinput("deleteFileViaThumb", frame);
          } else {
            test[hash] = 1;
            if (!v.base64 && !v.isCommitted) {
              self.srcInfo.get(k).base64 = await self.calcBase64(files[k].file);
            }
          }
        });

        if (duplicatedFileNames.length) {
          duplicatedFileNames = [...new Set(duplicatedFileNames)];
          self.input.fileinput(
            "customMsgs",
            duplicatedFileNames.map(
              i =>
                `File ${i} automatically removed because file has same hash selected earlier.`
            )
          );
        }
        // Fix "fileremove" not work after file has been uploaded
        self.srcInfo.forEach((v, k) => {
          $(`[data-fileid="${k}"] .kv-file-remove`).click(function () {
            self.srcInfoDel.fileId = k;
            if ($("#showTime").hasClass("d-none"))
              self.srcInfoDel(false, false);
            else {
              self.openFileDelModal();
            }
          });
        });
        self.input.fileinput("enable");
      })
      .on("fileremove", function () {
        logWarn("fileremove");
        // Not work after file has been uploaded
      })
      .on("fileclear", () => {
        logWarn("fileclear");
        if ($("#showTime").hasClass("d-none")) self.srcInfoDel(true, false);
        else self.openFileDelModal(true);
      });

    /* Add button click event for file delete confirm modal */
    $("#srcInfoDel").click(() => {
      $("#srcInfoDelModal").hasClass("remove-src")
        ? this.srcInfoDel(false, false)
        : this.srcInfoDel(true, false);
      self.showTime();
      $("#srcInfoDelModal").modal("hide");
    });
    $("#srcInfoDelSoft").click(() => {
      $("#srcInfoDelModal").hasClass("remove-src")
        ? this.srcInfoDel(false)
        : this.srcInfoDel(true);
      self.showTime();
    });
    /* Add way to upload file in clipboard */
    window.addEventListener("paste", function (event) {
      if (event.clipboardData || event.originalEvent) {
        let clipboardData =
          event.clipboardData || event.originalEvent.clipboardData;
        if (clipboardData.items) {
          // For Chrome
          let items = clipboardData.items,
            len = items.length,
            blob = null;
          for (let i = 0; i < len; i++) {
            if (items[i].type.indexOf("image") !== -1) {
              blob = items[i].getAsFile();
              self.input.fileinput("readFiles", clipboardData.files);
            }
          }
        } else {
          /* For Firefox */
        }
      }
    });
    /* Add click to upload for input box */
    document.querySelector(".kv-fileinput-caption").onclick = () =>
      this.input.click();
  },
  req({ type = "GET", path, data }) {
    return $.ajax({
      url: `https://api.github.com/repos/${this.config.repo.info.full_name}/git/${path}`,
      type,
      headers: { Authorization: `token ${this.config.token}` },
      contentType: "application/json;charset=UTF-8",
      data,
    });
  },
  updateSha(handler, commitSha) {
    const settings = {
      path: `refs/heads/${this.config.branch.info.name}`,
    };
    if (commitSha) {
      settings.type = "PATCH";
      settings.data = JSON.stringify({ sha: commitSha });
    }
    this.req(settings)
      .done(res => {
        handler(true, res);
      })
      .fail(res => {
        handler(false, res);
      });
  },
  initUploadInfo() {
    this.branchShaObtained = false;
    this.blobsCreated = false;
    this.uploadInfo = { blobItems: [] };
  },
  writeToTreeAndCommit() {
    if (!this.branchShaObtained || !this.blobsCreated) {
      return;
    }
    let self = this,
      /* prettier-ignore */
      tree = this.uploadInfo.blobItems.map(id => this.srcInfo.get(id).blobInfo),
      branchSha = this.uploadInfo.branchSha;
    this.setProgressTip("Blobs created. Creating blobs tree...", 90);
    this.req({
      path: "trees",
      type: "POST",
      data: JSON.stringify({ tree, base_tree: branchSha }),
    })
      .done(res => {
        self.setProgressTip("Blobs tree created. Committing...", 94);
        logWarn("Blobs' tree created:", res.sha);
        self
          .req({
            path: "commits",
            type: "POST",
            data: JSON.stringify({
              message: `${new Date().toISOString().split("T")[0]} via GIH`,
              tree: res.sha,
              parents: [branchSha],
            }),
          })
          .done(res => {
            self.setProgressTip("Committed. Waiting for update...", 98);
            logWarn("Committed:", res.sha);
            self.updateSha(function (status) {
              if (status) {
                self.setProgressTip(null, 101);
                logWarn(
                  "Upload Finished.\n",
                  /* prettier-ignore */
                  tree.map((i) => `https://raw.githubusercontent.com/${self.config.repo.info.full_name}/${self.config.branch.info.name}/${i.path}`).join("\n")
                );
                self.uploadInfo.blobItems.forEach(id => {
                  self.srcInfo.get(id).isCommitted = true;
                });
                self.showTime();
              } else {
                self.setProgressTip("Repo update failure");
              }
              self.initUploadInfo();
            }, res.sha);
          })
          .fail(res => {
            self.setProgressTip("Committed failure");
          });
      })
      .fail(res => {
        self.setProgressTip("Uploaded files' tree created failure");
      });
  },
  setProgressTip(tip, p) {
    if (!p) {
      this.input.fileinput("_setProgress", 101, null, tip);
    } else if (p === 101) {
      this.input.fileinput("_setProgress", 101);
    } else this.input.fileinput("setCustomProgressTip", p, tip);
  },
  initUploadEvents() {
    let self = this;
    this.input
      .on("filebatchpreupload", function () {
        self.updateSha(function (status, res) {
          if (status) {
            self.uploadInfo.branchSha = res.object.sha;
            self.branchShaObtained = true;
            self.writeToTreeAndCommit();
          } else {
            self.input.fileinput("customMsgs", [
              `Get branch sha failed: ${res.responseText}`,
            ]);
            self.input.fileinput("cancel");
          }
        });
      })
      .on("fileuploaded", function () {
        const sha = arguments[1].response.sha;
        const fileId = $(`[id="${arguments[2]}"]`).attr("data-fileid");
        self.uploadInfo.blobItems.push(fileId);
        logWarn(`Blob ${fileId} created.\n`, arguments);
        self.srcInfo.get(fileId).blobInfo = {
          sha,
          mode: "100644",
          type: "blob",
          path: self.parsePath(fileId),
        };
      })
      .on("filebatchuploadcomplete", function () {
        if (self.uploadInfo.blobItems.length) {
          logWarn("filebatchuploadcomplete\n", arguments);
          self.blobsCreated = true;
          self.writeToTreeAndCommit();
        }
      });
  },
  init() {
    this.initConfig();
    this.initFileEvents();
    this.initUploadEvents();

    !this.config.token && this.input.fileinput("disable");

    $("div[role=tabpanel] > pre").each((i, e) => {
      $(e).click(() => {
        let range = document.createRange(),
          sel = window.getSelection();
        range.selectNodeContents(e);
        sel.removeAllRanges();
        sel.addRange(range);
      });
    });

    $("#isUseCDN").prop(
      "checked",
      JSON.parse(localStorage.getItem("isUseCdn"))
    );
    $("#isUseCDN").change(() => {
      localStorage.setItem("isUseCdn", this.isUseCdn);
      if ($("#showTime").hasClass("d-none")) return;
      this.showTime();
    });
  },
  showTime() {
    $("#imgPreview").html("");
    $("#codeBBCode").html("");
    $("#codeHTML").html("");
    $("#codeURL").html("");
    $("#codeMarkdown").html("");
    $("#showTime").addClass("d-none");
    let committedArr = [];
    this.srcInfo.forEach((v, k) => {
      v.isCommitted && committedArr.push(k);
    });
    if (!committedArr.length) return;
    $("#showTime").removeClass("d-none");
    let repoUrl,
      getUrl = path => {
        let repo = this.config.repo.info.full_name,
          branch = this.config.branch.info.name;
        repoUrl = `https://github.com/${repo}/blob/${branch}/${path}`;
        return this.isUseCdn
          ? `https://cdn.jsdelivr.net/gh/${repo}@${branch}/${path}`
          : `https://raw.githubusercontent.com/${repo}/${branch}/${path}`;
      };
    committedArr.forEach(id => {
      let path = this.srcInfo.get(id).blobInfo.path,
        url = getUrl(path);
      $("#imgPreview").append(this.previewTemplate(repoUrl, url));
      $("#codeBBCode").append(`[img]${url}[/img]\n`);
      $("#codeHTML").append(`&lt;img src=&quot;${url}&quot;&gt;\n`);
      $("#codeURL").append(`${url}\n`);
      $("#codeMarkdown").append(`![](${url})\n`);
    });
  },
  previewTemplate(repoUrl, url) {
    return `<fieldset><legend><a href="${repoUrl}" target="_blank" rel="noopener"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAHfSURBVDjLpZO9a5NhFMV/bxowYvNRjf1IoCDo0KFJBVHEVbeCi5N/gM6KruLi6KiDKA6KIC6CQwdtBxfRrUGHFlTQIlikjTFpkua55zo8r7aDipALd3keOOdwzrmJuzPMZF/cOPFXBMmRHJMTTJiJYCIEESy+ZQGqczPIDNxxd/AMDriBu+MSCkJmSA4CJ8Pym+UIIAs0177S3Wz9F3O+WGCiMrmjwM3pbrZ4fvo17kR237XAtcolRvdOA+L+9TscHB/HTGQAlLqwuHWbxa1b9JMVTBDSHRi82qijbgPXNsGEpx5kouYo+2jpI/3kCUudiwzUJBgMAoQAjf4ZFtZP0mq/x0xIYPJUQQoQLHAsX8fMeNk7y4DVCGKw0q7ytHmByx/u/lYgOVnJUbBomAa8azWYr5b50unRGZln48ccYzrH5/VTtHuTKIxQk8dUdgMEE/XyN2YPTFHJHaZWFPIan/KriEccqT5ExJi15FiwWCSTo+CYiYk9h5CL4NvIhSOmctOxCwgh3J3vauAWnc8GEzInt2+U3s1nuEWwmPlOByzthuSUSyV+XUDWTOAJxbEyhcJ+pPgxc/4KnbUFQOTKx3n74B5uQhI4JEkMMHl8ddZ3d/tfzH+aZNhrzDDk/ARfG6G/LNZPQgAAAABJRU5ErkJggg==" alt=""></a></legend><div class="d-md-flex align-items-center"><div class="px-2 py-1 text-center"> <a href="${url}" target="_blank" rel="noopener"> <img loading="lazy" src="${url}"></a></div><div class="px-2 py-1 w-100"><div> <label class="w-100">URL<input class="form-control form-control-sm" onclick="this.select();" value="${url}"></label></div><div> <label class="w-100">Markdown<input class="form-control form-control-sm" onclick="this.select();" value="![](${url})"></label></div><div> <label class="w-100">HTML<input class="form-control form-control-sm" onclick="this.select();" value="&lt;img src=&quot;${url}&quot;&gt;"></label></div><div> <label class="w-100">BBCode<input class="form-control form-control-sm" onclick="this.select();" value="[img]${url}[/img]"></label></div></div></div></fieldset>`;
  },
  reset() {
    this.initUploadInfo();
    this.srcInfo.clear();
    this.showTime();
    this.input.fileinput("clear");
  },
};

theWorld.init();
buildUp.init();
