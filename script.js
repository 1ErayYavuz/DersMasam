// ===== DEĞİŞKENLER =====
let kalanSaniye = 0;
let toplamSaniye = 0;
let sayacInterval = null;
let suInterval = null;
let duraklatildi = false;
let suSayaci = 0;
let motivasyonMetni = "";
let odulMetni = "";
let baslangicDakika = 0;
let sesBaglami = null; // Web Audio (internet gerekmez)

// Ayarlar (varsayılanlar)
let ayarlar = {
    bitisSesi: true,
    suHatirlatma: true,
    suSesi: true
};

// Notları localStorage'dan al
let notlar = [];
try {
    notlar = JSON.parse(localStorage.getItem("dersNotlar")) || [];
} catch (e) {
    notlar = [];
}

// Sayfa açılınca eski oturum var mı bak
window.onload = function () {
    ayarlariYukle();
    notlariGoster();

    // Enter ile not ekle
    var notInput = document.getElementById("not-input");
    if (notInput) {
        notInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
                notEkle();
            }
        });
    }

    // Girişte Enter ile başlat
    document.getElementById("dakika-input").addEventListener("keydown", enterIleBaslat);
    document.getElementById("motivasyon-input").addEventListener("keydown", enterIleBaslat);
    document.getElementById("odul-input").addEventListener("keydown", enterIleBaslat);

    // Escape ile ayarları kapat
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            ayarlariKapat();
        }
    });

    // Kayıtlı oturum varsa formu doldur
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

// ===== ODAK BAŞLAT =====
function odagiBaslat() {
    // Kullanıcı tıkladı → sesi hazırla (bitişte çalsın diye)
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

    // Kayıtlı oturum varsa sor (lise projesi gibi basit)
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

    // Ekranları ayarla
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

// ===== SAYAÇ =====
function sayaciBaslat() {
    // Eski interval varsa temizle
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

    // Progress bar
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

// ===== SÜRE BİTTİ =====
function sureBitti() {
    suSistemiDurdur();
    localStorage.removeItem("dersOturum");

    // Bitiş ekranını aç
    document.getElementById("ana-panel").classList.add("gizli");
    document.getElementById("bitis-ekrani").classList.remove("gizli");

    var odulYazi = document.getElementById("bitis-odul");
    if (odulMetni) {
        odulYazi.textContent = "🎁 Ödülün: " + odulMetni;
    } else {
        odulYazi.textContent = "Kendine küçük bir mola ver ☕";
    }

    // Yumuşak kutlama sesi (ani/yüksek değil)
    yumusakKutlamaSesi();
}

// Tarayıcı sesi ilk tıklamada "açar" (yoksa çalmaz)
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
    } catch (e) {
        // ses yoksa devam et
    }
}

// Tek bir yumuşak nota (sesSeviyesi isteğe bağlı)
function yumusakNotaCal(frekans, baslangic, sure, sesSeviyesi) {
    if (!sesBaglami) {
        return;
    }

    if (!sesSeviyesi) {
        sesSeviyesi = 0.12;
    }

    var osc = sesBaglami.createOscillator();
    var gain = sesBaglami.createGain();

    // sine = yumuşak, korkutmaz
    osc.type = "sine";
    osc.frequency.value = frekans;

    // yavaş açılır, yavaş kapanır (ani patlama yok)
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

// Uzun ama sakin kutlama melodisi (~6 saniye)
// Kullanıcı "aa bitti" diye net anlasın, ama ürkmesin
function yumusakKutlamaSesi() {
    if (!ayarlar.bitisSesi) {
        return;
    }

    try {
        sesiHazirla();
        if (!sesBaglami) {
            return;
        }

        // 1. tur: yavaş yükselen mini melodi
        yumusakNotaCal(392.00, 0.00, 0.55, 0.10); // G4
        yumusakNotaCal(493.88, 0.45, 0.55, 0.11); // B4
        yumusakNotaCal(587.33, 0.90, 0.65, 0.12); // D5
        yumusakNotaCal(659.25, 1.40, 0.80, 0.13); // E5

        // kısa nefes
        // 2. tur: biraz daha net, tebrik gibi
        yumusakNotaCal(523.25, 2.40, 0.50, 0.12); // C5
        yumusakNotaCal(659.25, 2.85, 0.50, 0.13); // E5
        yumusakNotaCal(783.99, 3.30, 0.55, 0.14); // G5
        yumusakNotaCal(1046.5, 3.80, 0.95, 0.15); // C6 (yüksek, mutlu)

        // 3. tur: yavaş kapanış (bitti hissi)
        yumusakNotaCal(783.99, 4.90, 0.55, 0.11); // G5
        yumusakNotaCal(659.25, 5.35, 0.55, 0.10); // E5
        yumusakNotaCal(523.25, 5.80, 1.10, 0.12); // C5 (uzun final)
    } catch (e) {
        // ses çalmazsa sorun değil
    }
}

// ===== SU SESİ MELODİLERİ =====
// Su damlalarını taklit eden yumuşak melodiler

// Melodi 1: Damlama sesi - yuksek frekansli damlalar
function suMelodisi1() {
    if (!ayarlar.suSesi) return;
    try {
        sesiHazirla();
        if (!sesBaglami) return;

        // Damlama efekti: yuksek frekans, kisa sureli
        yumusakNotaCal(1200, 0.00, 0.15, 0.08);  // damla 1
        yumusakNotaCal(1400, 0.12, 0.12, 0.07);  // damla 2
        yumusakNotaCal(1100, 0.25, 0.18, 0.09);  // damla 3
        yumusakNotaCal(1600, 0.38, 0.10, 0.06);  // damla 4
        yumusakNotaCal(1300, 0.50, 0.20, 0.08);  // damla 5
    } catch (e) {}
}

// Melodi 2: Akarsu sesi - alcalan yukari frekanslar
function suMelodisi2() {
    if (!ayarlar.suSesi) return;
    try {
        sesiHazirla();
        if (!sesBaglami) return;

        // Akarsu: yukselip alcalan dalga
        yumusakNotaCal(800, 0.00, 0.30, 0.07);
        yumusakNotaCal(1000, 0.25, 0.25, 0.08);
        yumusakNotaCal(1200, 0.45, 0.20, 0.07);
        yumusakNotaCal(900, 0.60, 0.35, 0.06);
        yumusakNotaCal(700, 0.90, 0.40, 0.05);
    } catch (e) {}
}

// Melodi 3: Su perdesi - coklu frekans harmonik
function suMelodisi3() {
    if (!ayarlar.suSesi) return;
    try {
        sesiHazirla();
        if (!sesBaglami) return;

        // Perde efekti: ustuste binen notalar
        yumusakNotaCal(660, 0.00, 0.50, 0.06);
        yumusakNotaCal(880, 0.10, 0.45, 0.07);
        yumusakNotaCal(1100, 0.20, 0.40, 0.06);
        yumusakNotaCal(990, 0.35, 0.55, 0.05);
        yumusakNotaCal(770, 0.50, 0.60, 0.06);
    } catch (e) {}
}

function tekrarBaslat() {
    // Aynı süreyle yeniden başla
    document.getElementById("dakika-input").value = baslangicDakika || 45;
    document.getElementById("motivasyon-input").value = motivasyonMetni;
    document.getElementById("odul-input").value = odulMetni;

    // Yeni oturum olsun diye kaydı sil
    localStorage.removeItem("dersOturum");
    suSayaci = 0;

    odagiBaslat();
}

// ===== ÇIKIŞ =====
function masayiKapat() {
    if (sayacInterval) {
        clearInterval(sayacInterval);
        sayacInterval = null;
    }
    suSistemiDurdur();

    // Kalan süre varsa kaydet, yoksa sil
    if (kalanSaniye > 0) {
        oturumuKaydet();
    } else {
        localStorage.removeItem("dersOturum");
    }

    document.getElementById("ana-panel").classList.add("gizli");
    document.getElementById("bitis-ekrani").classList.add("gizli");
    document.getElementById("giris-ekrani").classList.remove("gizli");

    // İpucu göster
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

// ===== NOTLAR (güvenli yazdırma) =====
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

    // Tümünü sil butonu: not varsa göster
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
        // createElement kullanıyorum ki zararlı kod çalışmasın
        var kart = document.createElement("div");
        kart.className = "post-it";

        var metin = document.createElement("div");
        metin.className = "metin";
        metin.textContent = notlar[i]; // textContent = güvenli

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

// Tüm görevleri sil
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

// ===== AYARLAR =====
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
    } catch (e) {
        // varsayılanlar kalsın
    }

    // Checkbox'ları doldur
    document.getElementById("ayar-bitis-ses").checked = ayarlar.bitisSesi;
    document.getElementById("ayar-su").checked = ayarlar.suHatirlatma;
    document.getElementById("ayar-su-ses").checked = ayarlar.suSesi;
}

function ayariKaydet() {
    ayarlar.bitisSesi = document.getElementById("ayar-bitis-ses").checked;
    ayarlar.suHatirlatma = document.getElementById("ayar-su").checked;
    ayarlar.suSesi = document.getElementById("ayar-su-ses").checked;

    localStorage.setItem("dersAyarlar", JSON.stringify(ayarlar));

    // Oturum açıksa su sistemini ayara göre yenile
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

// Dışarı tıklayınca kapat (kutunun içi değil)
function ayarDisariTik(e) {
    if (e.target.id === "ayarlar-kaplama") {
        ayarlariKapat();
    }
}

// ===== SU SİSTEMİ =====
function suSistemiBaslat() {
    suSistemiDurdur();

    // Ayarlarda kapalıysa başlatma
    if (!ayarlar.suHatirlatma) {
        return;
    }

    // 30 dakika aralıkla su hatırlatma
    var suAralikMs = 1800000;

    suInterval = setInterval(function () {
        if (duraklatildi) {
            return; // duraklatılınca su sayma
        }

        if (!ayarlar.suHatirlatma) {
            return;
        }

        suSayaci = suSayaci + 1;
        var badge = document.getElementById("su-bilgisi");
        badge.textContent = "💧 " + suSayaci + " Bardak";
        badge.classList.remove("su-parla");
        // animasyonu tekrar oynat
        void badge.offsetWidth;
        badge.classList.add("su-parla");

        // Su sesi (ayar açıksa) — rastgele melodi seç
        if (ayarlar.suSesi) {
            try {
                sesiHazirla();
                // 3 farklı su melodiinden rastgele birini çal
                var melodiIndex = Math.floor(Math.random() * 3);
                if (melodiIndex === 0) {
                    suMelodisi1();
                } else if (melodiIndex === 1) {
                    suMelodisi2();
                } else {
                    suMelodisi3();
                }
            } catch (e) {
                // ses yoksa sorun değil
            }
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

// ===== LOCALSTORAGE OTURUM =====
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

// ===== TAM EKRAN =====
function tamEkran() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(function () {
            alert("Tam ekran açılamadı.");
        });
    } else {
        document.exitFullscreen();
    }
}
