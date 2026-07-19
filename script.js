let kalanSaniye = 0;
let toplamSaniye = 0;
let sayacInterval = null;
let suInterval = null;
let duraklatildi = false;
let suSayaci = 0;
let motivasyonMetni = "";
let odulMetni = "";
let baslangicDakika = 0;
let sesBaglami = null;

let ayarlar = {
    bitisSesi: true,
    suHatirlatma: true,
    suSesi: true
};

let notlar = [];
try {
    notlar = JSON.parse(localStorage.getItem("dersNotlar")) || [];
} catch (e) {
    notlar = [];
}

window.onload = function () {
    ayarlariYukle();
    notlariGoster();

    var notInput = document.getElementById("not-input");
    if (notInput) {
        notInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
                notEkle();
            }
        });
    }

    document.getElementById("dakika-input").addEventListener("keydown", enterIleBaslat);
    document.getElementById("motivasyon-input").addEventListener("keydown", enterIleBaslat);
    document.getElementById("odul-input").addEventListener("keydown", enterIleBaslat);

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            ayarlariKapat();
        }
    });

    var kayit = oturumuOku();
    if (kayit && kayit.kalanSaniye > 0) {
        document.getElementById("dakika-input").value = kayit.baslangicDakika || Math.ceil(kayit.kalanSaniye / 60);
        document.getElementById("motivasyon-input").value = kayit.motivasyon || "";
        document.getElementById("odul-input").value = kayit.odul || "";
        document.getElementById("devam-ipucu").classList.remove("gizli");
    }
};

function enterIleBaslat(e) {
    if (e.key === "Enter") {
        odagiBaslat();
    }
}

function odagiBaslat() {
    sesiHazirla();

    var dkKutu = document.getElementById("dakika-input");
    var dk = Number(dkKutu.value);
    var motivasyon = document.getElementById("motivasyon-input").value.trim();
    var odul = document.getElementById("odul-input").value.trim();

    if (!dk || dk <= 0 || dk > 300) {
        alert("Lütfen 1 ile 300 arasında bir süre girin!");
        dkKutu.focus();
        return;
    }

    var kayit = oturumuOku();
    var devamMi = false;

    if (kayit && kayit.kalanSaniye > 0) {
        var kalanDk = Math.ceil(kayit.kalanSaniye / 60);
        devamMi = confirm(
            "Yarım kalmış bir oturumun var (~" + kalanDk + " dk).\nKaldığın yerden devam edilsin mi?\n\nTamam = Devam\nİptal = Yeni oturum"
        );
    }

    if (devamMi && kayit) {
        baslangicDakika = kayit.baslangicDakika;
        kalanSaniye = kayit.kalanSaniye;
        toplamSaniye = kayit.toplamSaniye;
        suSayaci = kayit.suSayaci || 0;
        motivasyonMetni = kayit.motivasyon || motivasyon;
        odulMetni = kayit.odul || odul;
    } else {
        baslangicDakika = dk;
        kalanSaniye = dk * 60;
        toplamSaniye = dk * 60;
        suSayaci = 0;
        motivasyonMetni = motivasyon;
        odulMetni = odul;
    }

    document.getElementById("giris-ekrani").classList.add("gizli");
    document.getElementById("bitis-ekrani").classList.add("gizli");
    document.getElementById("ana-panel").classList.remove("gizli");

    document.getElementById("motivasyon-alani").textContent =
        motivasyonMetni ? "✨ " + motivasyonMetni : "✨ ODAK MODU";

    document.getElementById("hedef-metni").textContent =
        odulMetni ? "Bittiğinde ödülün: " + odulMetni : "Odaklan, başaracaksın.";

    document.getElementById("su-bilgisi").textContent = "💧 " + suSayaci + " Bardak";
    document.getElementById("duraklat-btn").textContent = "⏸ Duraklat";
    duraklatildi = false;

    sayaciGoster();
    sayaciBaslat();
    suSistemiBaslat();
    notlariGoster();
    oturumuKaydet();
}

function sayaciBaslat() {
    if (sayacInterval) {
        clearInterval(sayacInterval);
    }

    sayacInterval = setInterval(function () {
        if (duraklatildi) {
            return;
        }

        kalanSaniye = kalanSaniye - 1;
        sayaciGoster();
        oturumuKaydet();

        if (kalanSaniye <= 0) {
            clearInterval(sayacInterval);
            sayacInterval = null;
            sureBitti();
        }
    }, 1000);
}

function sayaciGoster() {
    var gosterilecek = Math.max(0, kalanSaniye);
    var dak = Math.floor(gosterilecek / 60);
    var san = gosterilecek % 60;

    document.getElementById("sayac").textContent =
        String(dak).padStart(2, "0") + ":" + String(san).padStart(2, "0");

    var yuzde = 0;
    if (toplamSaniye > 0) {
        yuzde = ((toplamSaniye - gosterilecek) / toplamSaniye) * 100;
    }
    document.getElementById("bar-ic").style.width = yuzde + "%";
}

function duraklatDevam() {
    duraklatildi = !duraklatildi;
    var btn = document.getElementById("duraklat-btn");

    if (duraklatildi) {
        btn.textContent = "▶ Devam";
    } else {
        btn.textContent = "⏸ Duraklat";
    }

    oturumuKaydet();
}

function sayaciSifirla() {
    if (!confirm("Sayaç başa dönecek. Emin misin?")) {
        return;
    }

    kalanSaniye = toplamSaniye;
    duraklatildi = false;
    document.getElementById("duraklat-btn").textContent = "⏸ Duraklat";
    sayaciGoster();
    oturumuKaydet();

    if (!sayacInterval) {
        sayaciBaslat();
    }
}

function sureBitti() {
    suSistemiDurdur();
    localStorage.removeItem("dersOturum");

    document.getElementById("ana-panel").classList.add("gizli");
    document.getElementById("bitis-ekrani").classList.remove("gizli");

    var odulYazi = document.getElementById("bitis-odul");
    if (odulMetni) {
        odulYazi.textContent = "🎁 Ödülün: " + odulMetni;
    } else {
        odulYazi.textContent = "Kendine küçük bir mola ver ☕";
    }

    yumusakKutlamaSesi();
}

function sesiHazirla() {
    try {
        var AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) {
            return;
        }
        if (!sesBaglami) {
            sesBaglami = new AudioCtx();
        }
        if (sesBaglami.state === "suspended") {
            sesBaglami.resume();
        }
    } catch (e) {}
}

function yumusakNotaCal(frekans, baslangic, sure, sesSeviyesi) {
    if (!sesBaglami) {
        return;
    }

    if (!sesSeviyesi) {
        sesSeviyesi = 0.12;
    }

    var osc = sesBaglami.createOscillator();
    var gain = sesBaglami.createGain();

    osc.type = "sine";
    osc.frequency.value = frekans;

    var t = sesBaglami.currentTime + baslangic;

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(sesSeviyesi, t + 0.15);
    gain.gain.exponentialRampToValueAtTime(sesSeviyesi * 0.7, t + sure * 0.55);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + sure);

    osc.connect(gain);
    gain.connect(sesBaglami.destination);

    osc.start(t);
    osc.stop(t + sure + 0.05);
}

function yumusakKutlamaSesi() {
    if (!ayarlar.bitisSesi) {
        return;
    }

    try {
        sesiHazirla();
        if (!sesBaglami) {
            return;
        }

        yumusakNotaCal(392.00, 0.00, 0.55, 0.10);
        yumusakNotaCal(493.88, 0.45, 0.55, 0.11);
        yumusakNotaCal(587.33, 0.90, 0.65, 0.12);
        yumusakNotaCal(659.25, 1.40, 0.80, 0.13);

        yumusakNotaCal(523.25, 2.40, 0.50, 0.12);
        yumusakNotaCal(659.25, 2.85, 0.50, 0.13);
        yumusakNotaCal(783.99, 3.30, 0.55, 0.14);
        yumusakNotaCal(1046.5, 3.80, 0.95, 0.15);

        yumusakNotaCal(783.99, 4.90, 0.55, 0.11);
        yumusakNotaCal(659.25, 5.35, 0.55, 0.10);
        yumusakNotaCal(523.25, 5.80, 1.10, 0.12);
    } catch (e) {}
}

function suMelodisi1() {
    if (!ayarlar.suSesi) return;
    try {
        sesiHazirla();
        if (!sesBaglami) return;

        yumusakNotaCal(1200, 0.00, 0.15, 0.08);
        yumusakNotaCal(1400, 0.12, 0.12, 0.07);
        yumusakNotaCal(1100, 0.25, 0.18, 0.09);
        yumusakNotaCal(1600, 0.38, 0.10, 0.06);
        yumusakNotaCal(1300, 0.50, 0.20, 0.08);
    } catch (e) {}
}

function suMelodisi2() {
    if (!ayarlar.suSesi) return;
    try {
        sesiHazirla();
        if (!sesBaglami) return;

        yumusakNotaCal(800, 0.00, 0.30, 0.07);
        yumusakNotaCal(1000, 0.25, 0.25, 0.08);
        yumusakNotaCal(1200, 0.45, 0.20, 0.07);
        yumusakNotaCal(900, 0.60, 0.35, 0.06);
        yumusakNotaCal(700, 0.90, 0.40, 0.05);
    } catch (e) {}
}

function suMelodisi3() {
    if (!ayarlar.suSesi) return;
    try {
        sesiHazirla();
        if (!sesBaglami) return;

        yumusakNotaCal(660, 0.00, 0.50, 0.06);
        yumusakNotaCal(880, 0.10, 0.45, 0.07);
        yumusakNotaCal(1100, 0.20, 0.40, 0.06);
        yumusakNotaCal(990, 0.35, 0.55, 0.05);
        yumusakNotaCal(770, 0.50, 0.60, 0.06);
    } catch (e) {}
}

function tekrarBaslat() {
    document.getElementById("dakika-input").value = baslangicDakika || 45;
    document.getElementById("motivasyon-input").value = motivasyonMetni;
    document.getElementById("odul-input").value = odulMetni;

    localStorage.removeItem("dersOturum");
    suSayaci = 0;

    odagiBaslat();
}

function masayiKapat() {
    if (sayacInterval) {
        clearInterval(sayacInterval);
        sayacInterval = null;
    }
    suSistemiDurdur();

    if (kalanSaniye > 0) {
        oturumuKaydet();
    } else {
        localStorage.removeItem("dersOturum");
    }

    document.getElementById("ana-panel").classList.add("gizli");
    document.getElementById("bitis-ekrani").classList.add("gizli");
    document.getElementById("giris-ekrani").classList.remove("gizli");

    var kayit = oturumuOku();
    if (kayit && kayit.kalanSaniye > 0) {
        document.getElementById("devam-ipucu").classList.remove("gizli");
        document.getElementById("dakika-input").value = kayit.baslangicDakika;
        document.getElementById("motivasyon-input").value = kayit.motivasyon || "";
        document.getElementById("odul-input").value = kayit.odul || "";
    } else {
        document.getElementById("devam-ipucu").classList.add("gizli");
    }
}

function notEkle() {
    var input = document.getElementById("not-input");
    var yazi = input.value.trim();

    if (!yazi) {
        return;
    }

    notlar.push(yazi);
    input.value = "";
    notlariGoster();
    input.focus();
}

function notlariGoster() {
    var kutu = document.getElementById("notlar-konteynir");
    kutu.innerHTML = "";

    var tumunuSilBtn = document.getElementById("tumunu-sil-btn");
    if (tumunuSilBtn) {
        if (notlar.length > 0) {
            tumunuSilBtn.classList.remove("gizli");
        } else {
            tumunuSilBtn.classList.add("gizli");
        }
    }

    if (notlar.length === 0) {
        var bos = document.createElement("p");
        bos.className = "bos-not";
        bos.textContent = "Henüz görev yok. Yukarıdan ekleyebilirsin.";
        kutu.appendChild(bos);
        localStorage.setItem("dersNotlar", JSON.stringify(notlar));
        return;
    }

    for (var i = 0; i < notlar.length; i++) {
        var kart = document.createElement("div");
        kart.className = "post-it";

        var metin = document.createElement("div");
        metin.className = "metin";
        metin.textContent = notlar[i];

        var silBtn = document.createElement("button");
        silBtn.type = "button";
        silBtn.className = "sil-btn";
        silBtn.textContent = "🗑️";
        silBtn.title = "Sil";
        silBtn.setAttribute("data-index", i);
        silBtn.onclick = function () {
            var index = Number(this.getAttribute("data-index"));
            notSil(index);
        };

        kart.appendChild(metin);
        kart.appendChild(silBtn);
        kutu.appendChild(kart);
    }

    localStorage.setItem("dersNotlar", JSON.stringify(notlar));
}

function notSil(i) {
    notlar.splice(i, 1);
    notlariGoster();
}

function tumNotlariSil() {
    if (notlar.length === 0) {
        return;
    }

    var eminMi = confirm("Tüm görevler silinecek (" + notlar.length + " adet). Emin misin?");
    if (!eminMi) {
        return;
    }

    notlar = [];
    notlariGoster();
}

function ayarlariYukle() {
    try {
        var ham = localStorage.getItem("dersAyarlar");
        if (ham) {
            var kayitli = JSON.parse(ham);
            if (typeof kayitli.bitisSesi === "boolean") {
                ayarlar.bitisSesi = kayitli.bitisSesi;
            }
            if (typeof kayitli.suHatirlatma === "boolean") {
                ayarlar.suHatirlatma = kayitli.suHatirlatma;
            }
            if (typeof kayitli.suSesi === "boolean") {
                ayarlar.suSesi = kayitli.suSesi;
            }
        }
    } catch (e) {}

    document.getElementById("ayar-bitis-ses").checked = ayarlar.bitisSesi;
    document.getElementById("ayar-su").checked = ayarlar.suHatirlatma;
    document.getElementById("ayar-su-ses").checked = ayarlar.suSesi;
}

function ayariKaydet() {
    ayarlar.bitisSesi = document.getElementById("ayar-bitis-ses").checked;
    ayarlar.suHatirlatma = document.getElementById("ayar-su").checked;
    ayarlar.suSesi = document.getElementById("ayar-su-ses").checked;

    localStorage.setItem("dersAyarlar", JSON.stringify(ayarlar));

    if (!document.getElementById("ana-panel").classList.contains("gizli")) {
        if (ayarlar.suHatirlatma) {
            suSistemiBaslat();
        } else {
            suSistemiDurdur();
        }
    }
}

function ayarlariAc() {
    ayarlariYukle();
    document.getElementById("ayarlar-kaplama").classList.remove("gizli");
}

function ayarlariKapat() {
    document.getElementById("ayarlar-kaplama").classList.add("gizli");
}

function ayarDisariTik(e) {
    if (e.target.id === "ayarlar-kaplama") {
        ayarlariKapat();
    }
}

function suSistemiBaslat() {
    suSistemiDurdur();

    if (!ayarlar.suHatirlatma) {
        return;
    }

    var suAralikMs = 1800000;

    suInterval = setInterval(function () {
        if (duraklatildi) {
            return;
        }

        if (!ayarlar.suHatirlatma) {
            return;
        }

        suSayaci = suSayaci + 1;
        var badge = document.getElementById("su-bilgisi");
        badge.textContent = "💧 " + suSayaci + " Bardak";
        badge.classList.remove("su-parla");
        void badge.offsetWidth;
        badge.classList.add("su-parla");

        if (ayarlar.suSesi) {
            try {
                sesiHazirla();
                var melodiIndex = Math.floor(Math.random() * 3);
                if (melodiIndex === 0) {
                    suMelodisi1();
                } else if (melodiIndex === 1) {
                    suMelodisi2();
                } else {
                    suMelodisi3();
                }
            } catch (e) {}
        }

        oturumuKaydet();
    }, suAralikMs);
}

function suSistemiDurdur() {
    if (suInterval) {
        clearInterval(suInterval);
        suInterval = null;
    }
}

function oturumuKaydet() {
    var veri = {
        kalanSaniye: kalanSaniye,
        toplamSaniye: toplamSaniye,
        baslangicDakika: baslangicDakika,
        suSayaci: suSayaci,
        motivasyon: motivasyonMetni,
        odul: odulMetni,
        duraklatildi: duraklatildi
    };
    localStorage.setItem("dersOturum", JSON.stringify(veri));
}

function oturumuOku() {
    try {
        var ham = localStorage.getItem("dersOturum");
        if (!ham) {
            return null;
        }
        return JSON.parse(ham);
    } catch (e) {
        return null;
    }
}

function tamEkran() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(function () {
            alert("Tam ekran açılamadı.");
        });
    } else {
        document.exitFullscreen();
    }
}
