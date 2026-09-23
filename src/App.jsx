import { useState, useMemo, useEffect } from "react";

// Dark/Light mode — módulo nivel para acceso global
const getDM = () => { try { return localStorage.getItem("theme") !== "light"; } catch { return true; } };
let __darkMode = getDM();
let darkMode = __darkMode;
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, updateDoc, doc, setDoc, deleteDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAdfYXNZBGHHCbgCIsobZoIdFPLVtAIcB0",
  authDomain: "ticket2603.firebaseapp.com",
  projectId: "ticket2603",
  storageBucket: "ticket2603.firebasestorage.app",
  messagingSenderId: "610654398369",
  appId: "1:610654398369:web:006288839a1a94e6fd0de0"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Límite prudente para archivos guardados dentro de un documento de
// Firestore como texto base64 (el propio Firestore tiene un tope de 1MB
// por documento; dejamos margen para que quepan también el resto de
// campos del documento). Cuando la app se mueva a un servidor propio,
// este límite deja de ser necesario.
const MAX_ARCHIVO_BYTES = 700 * 1024; // 700 KB

// ── Autenticación anónima ──
// No sustituye al login por PIN (el usuario sigue entrando igual que siempre);
// es una identidad técnica e invisible que exige Firebase para poder leer/escribir
// en Firestore. Así las reglas de seguridad pueden negar el acceso a cualquiera
// que no pase por esta app (por ejemplo, alguien que llame directamente a la API
// con la apiKey, que siempre es pública).
const auth = getAuth(firebaseApp);
onAuthStateChanged(auth, (user) => {
  if (!user) signInAnonymously(auth).catch(err => console.error("Error de autenticación anónima:", err));
});

// ── Logo Grulla (icono grulla + logotipo completo, blanco sobre transparente) ──
const LOGO_GRULLA_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADoAAABYCAYAAACkh+R5AAAIFklEQVR42uWca6xcVRXH/3tm7r1tkCIvUWNVYqmNojSAQYmGiGmwKCag1oB+KDFo0g9qwgejkuAjPmIxNFKN0YSkXxR5hLQqSKiAVCkJlGrrI6IS1LYWFVug0HLn8fND18Ll5px7Z3rPnHtn3MnJuT2dc/b57/X6r7X2TFLNA0iSmpJ6kkgp4ddTSgBNSUopdTWKA0hAq+D6BLCy5J6mRnUAS4CrgJ8De4BDHB3/AvYD3wbemy3QnAGnmlRVkl4j6TJJn5b0Mkl7Jf1W0r2SDkpqSDpX0kckTUi6X9KGlNLtmcp3TbVZaBJsACcBlwKHgSeAC7LPLAXOBj4FPA60+e94ELis5LkTdm4sBKBNO98JbAReGv7vLcBNQI8Xj64dPn4JrLNFOb5onnA05gvkh4BNLgk7fz0D0rEjB+3XfTwNPAncCqwHVgKvmG8vm4DTgbV2rWXn9fbSvQxcz8C3gWk74iiSPMBTpjGfB1YD59QdLwWcDLSCJK+zl5vOXrxTAqINPBOOp+04APzb/n4uu+efwHbgUl/gVCdoSWsk3SRpWtJk+EjXPOohSfskbbZzQ9KdkvZbhCjztBgB8dGStFjSwZTSs2H+eogCcLepZqdAkpuAZaNMEBoG9gxTvV5QWQf5/ZwgmLq3wv0DH7UDtfNZmUNxx/Mk8MrorIYx6ow33czGsPkPpJT2GdvpjAPQZgnlrEXF6gR6RNKzBVKdBCbdFjXKIzCk+zMn5Jz2E/b/k6MO1B3ShQYusqGukYfLPT8dF7DXB2ZEFm6ucMmOrBo7cbAY+VimupFEXBG58iiThyawHPhbBjZK9hpgatixtS4Vfp0l2TnB99Ttp26vI1s7Cl54qdWI8jTM7fcRYNVIO6lYBQA+YylXDD2dAPqikQcbMptzjPfmcbYHPA+8e6RtNhIFA3sgA9sNYFePQ73XJXt2kGw3A9sG3jVOYM+yYnYngHUJ7wJOsDCVFrJNeiydCEesKbkaX5nF2eiNr1tw9hqANfr4bNMYkcfPW0KlMNZ6/zIoyDQkcMlSQFJKvXD9dCtinS/pzFAU+7ukLSmlv75QtUupA7xN0gOWzvm7enK+KqV0n392Xvhsdu1M4JPGdDpZ0ZpMLX/glXxT5yVmkxTY6vfmxSnFCU0Fr7S+Sbuk3TAdCtUxbXvIALpj2lZCJB6oqtM2iBSd0i0ygLtmaSuUjSN2vjo8+8slQO+qTaLRxQOXA7/JwHVnaCMUDb/nF8Aie+5FBSkdwA7guKE3lIJqTQE/LHjZuY5l9vz3F4QZX7xzc95caXEseMULJN2lo62Gnh3NCopuXTuk8jbEEUnP9fvA1hxArpL0I0lT5vKrDN5xsdoFi9CU9KCk3wPNfjZ2NAYEOWEgV0v6yRBA+gvfI2mP2f+HS2J+d5D2fmtAkG0Dudnu7VUsSe+KPZpSet7mPa3ks4sGeXBrAHVtAxdLut3uQ9UXwJ1R3WzSfLWkFQXah6THB3lwX/zT1PV9krbo6I6RYYDs2jN/LOlhU8uPSnq5mUcKIJOk2yqjsYEIvCOEjSpCBwUte68mLLc5TwR2ZqVQ78A9BazoN7T0w3gawEuAhwtiWZXD06/1Yf4NBXM6VdwekofKCMEXawL5jTD3hYEPU9Adv6Rsy92xquxbawL5tZCxnAA8GtQ0B/mQ57iVSNNW7I5ZdozMxSYd5FedStp5Y8mc/u/3VFJdCCp7XlaYqgPk9SUaFKXZmrM0w0aJKWBrVsaoYsRnfSkDuSFTZ7JNV4eBN1XlaV2aV1dsm9He9gMfzAphG0tAxmufrSz/DIWsXxXsBzrWERfrRmBpNue3ZgDp936hspZEqMCttEx/riCjx9xj9DHOt9xqRGWa49d2W2O4tdDiZm7XseDlYeudwL4+QO4ETnHyUlXdJwGn2e4ujsHT9rKX3g2sKeicXVOi1rnDegQ4uRLnU9CcfXMF3vQxYG2o+fizV1jlbqZyi4eyHQFkdcWvUBm/Notz/dhhJ2wYvgF4beShwGLgO9YNY4akIHrmNwyl5RA2Gd7Sp332MtXeBpxXYA7rgD/0sSe3G6S5ZlggfeUnTSqz2Wd82XuASwo48vnA5llssWjR1gytVhts6FXWXu/NsJnfX3gf8LG8FWEF7G+G+9uz5K/uoduBRAynfR/sc10fnhDgK8CpeafMjlMtKY5V937IxHcjUxo20LUlheLpIMWPF/VaMs1YBtzch8p2g5duDr2xG4jC50pK/74N/Iy8DVFm77OkW2RqfVUtTd3gjH5XYIuHPJXq1378G0b29w0lYN2Gn7FEe/jb4QLQXRm53gO8PUixMSDTck25t4AW+kLe5qGtlrafnXcHdd0CLJmLStnehGRdttxefZ4P1Nn6c6A7bPJbQzxsVvDcU8yR9bIvDgC8vlIu2+cL7QfuiKXOCuf4YyZJ9+ZvrA1oULNrfUNwxSATsLeAG2+trJo3qFQrKwq/OLb+rKDFf3dt9un9E/sSecO/UF5xn1PWs5H+9/tjh1XjeMGjxv1AQxiLs06YJN1YJ9C6vvdStIidcQRKQYuwPY5Ap4JkW5L+LGmrmUx3HIC6JP8UGr2Gb0R/OWMWMnJ8+GEJgF/X/S51qm4KTmlTLanZAnBGnXGVaA56WuM0sp8ocBs9EIrTaZwlumicVTeFuXZKmq7790waNalvR9I/7NJ9KaXDkpp1/lTPUIEakGZK6aCO7h9E0onz4S/qVJ/jTIW3l4SckQeKqe9eSU9I2jZDRjNWYeakukPL/9X4D2GixoEbxh8XAAAAAElFTkSuQmCC";
const LOGO_GRULLA_FULL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZoAAABgCAYAAAAkeLSoAAAjy0lEQVR42u1deZRcZZX/3arqJCTsm+IADiKgDgKyKxBWRRnhIA7qKAIGVwRxg2EEHNYZjzKCMiKbiMuAM4oMIGhYBBEdCAGCYhYYiCxG2UxCQkK6u+o3f7x76S+P96re92rt5v7OqVPd1a/f++pb7r4I+giSFQCiL4jIqH5es0sAUEQacDgcDocjgsEIyWrG55NITsv4vKpMyeFwOBzjDNIPJiMi1J83AbATgCMATAOwI4DJAGYBGAFwFYC7RWShMRwADft/h8PhcDjytJltSJ5J8gWO4RGSs0jeRXIOyeX6+RKS55PcMqXhiM+mw+FwOEIGUyE5jeTfk5ypTOR+kh8g+daM6w8iOY9kQ69dTPI8kq9PMa2avsSZj8PhcDijqZE8kOQiZRqV1DUfUuYzj+QyZTANkqOB5rOY5NdJvi7nOc54HA6H4xXKaESd/YtIfkI/G9L3I0jex+ZIM5znSd5J8nP62pjklIznDinjqXhAgcPhcExcJlPV908HTGaavp8SMI9RknV9NZowm1UZf1tM8o/q+zmW5AYkJ/nsOxwOR3/RddOSRZmR3BbAa0XkBpJTRORFkqcCOAtJhFkVQKhxNJDk0bx0KwC1yMc/CeAmAHUAlwB4HsDDHrXmcDgcE4jRBAxnkogMkxwSkZGAyYwqkwnHUtfP0lgOYKFem2YW9vuoMqxJAIYArKn3WwrgTwDe6YzG4XA4JiCjUWZTFZE6yR0A3K8MoJLDZBYCWATgR/pzFcA8EXnYl83hcDjGD2o9fl5FGcnhSExjjUBzof6tBuAkAJeIyNIMZtUWc3RtxuFwOCYoLNyY5BokF6gDv54KBCDJz4YaUPCqedSYw+FwOJoyGn2flsqRCRnObL1myJmKw+FwTAz0i5gPp3636sy/NIbkFZsdDodjYqDWp+fm+Umm+ZI4HA5HDuFMLD0VAPXx5G/uB6MRAFNy/rYiuMbhcDicuSRWngoAiEgdYxYgR86EWR2yn6hPZiTlo5kb1ERzZuNwOMar1tGpe1VTv29L8hqSe2f93YGxzpkkj1bGMpwRdXamXjPkzMbhcIwXraNTRN+E7eD3KSQPIHmF0sibSU4Or3HkM5u0VhP+fLoxG58xh8Mx4AymlvrsDW0wmGrw+ySSHwvSQSxSdxvXZopNZoXkFiT/FBTRZErLOT3QbDzU2eFwDBIdW635Isn1tUDwQyTfHsMIMhjMtlqAeF5AF19UOnlVKLA7imk1Hws0mUYGszkjXAyfOUcL4WVCv3ylB2evBb9vqAzmKaVZvy1iRrNrUiaybUleRnJFyspj1exXkXyz08O4BbNeNCcGzKWe0XvmCpKbh//j8IMeBJa4+cDRq30Xah3TSV6rreYNy0nu20qbyXDw/x3Jy1PtT0YCemiC+C/GqzbTtwFrBeeaiHyNJAF8Tf9kRTWrSCoxHwVgT5L7isgT+j+jvvVfWYccGvKu4Z1AEOJJcsuJ+LUx1ipjsp7VeV6rr+d7rxruO5LTAXwRwMHBZauQVIp/VERuI1kJ9unLrDkiMqq9sj4AYH8AHwxosRUaDmmz6OsaX5H2iAhIvovkwxkBAmZGW0jy067ZvLIOeYb0twXJHUh+m+SVGuo5kZDV9G85ydtITjazi++O3u49knuRvDG1LqO6VukgplozpkXysIyOwiM5zR5tPyzQOpEVX//yi2o+m81I3pJaxHTxzc87s5nw+0FSh/y1JM8leYO28J5IaKTMJIaVylw+THIrZzC9F3715z1IXt+kpXxDX38muY4VD27CZN4brPVoSqjOgj3rmFYmOUcEs9Gfz87Is6kHv3++meTgmDD74CAVPJ7LkPLskI6MQ8Zie7mRIdVeR/IjFsIaMl/fHT0RcCoBg7k2Y8+lYTTptDxGYFoIye2CKNvRCO12vmszHZYkgiCBszPMaKGa+nnn8BPukJtmuwnJr2VIdqM55oXxwFzypNdHSH6P5HEkt84y33iEUW81mSChnC2YgjGCp0iuHTKqHG3mygya1gx23UddsO7OghuzOasFs/lCJzNyHf1jMsHPhwX5AyPjmLnUdfzDGSaxJ0mer3b/tZ25DIapVjPwf1GAwaS1mVPzGEHAZN6s149G7J+G5uVMcm2m+9JtK2azs2s2E0KKrJE8IUOaG2/MZTSDmCwj+UuSJ5P8G5Jrpc2Fzlz6b64l+f6UX6SVltog+QzJdZv4ZmoltZnhlG/GtZkeaDYXZCyS2TrnqxPOOf74W1+T9tYnOSsjf2C8mMSyzGKPqdZyAsnNsva279mB0mY2Vk16pCCjGSmgzZhvZseAMcVoMw97geE2CUyrV7BQVZKvUhWyaftn5/rjUpNZj+S9JbWYUIPoxyuNh0hepJFFWU7hWp7k6+i7NnNRxB40hrGI5AZNtBkTlM8v6ZuZ4XStPHORooQoZUJ7t2bOjqQYTZ3kTV7NdHwxGSW665GcnRFhWJTJDIKp7LfqzD9Ek/DSe94l0sEXdjYn+UKEP9ByXi4OGUrOPp8W5AfWI7SZ/1OaNiG03lqXF1IAVESkHmbKktwfSSbtRgBm6McNJBmxvwFws4j8Sq9t6H1uBLBU/4dIMmVNajwAwPoi8mfNyvXGQIONqlaGOBnATkhae08quq2QZE/XADwO4G4AF6G3zaBs/y0RkTlZ5sD0nncMJCpaleQUAFORVCIpQtSret1VAe16maakFQCOBPB6vXcRetvQ6/5VRFZ5JZTWds906ewDSJ5Dck5BafFmkhvr/1rUxbk5rQUaJE9yNXN8aLb6/ildt+FIn4jhTJLrD4h25prLOKRRgdb5dITGYSbTmeF+zqB/Fc19eSzInSqqzTxqeTMTZb5rXVhA48CjJDcE8GkARyhXD7k2W0iMBwC4VWsLLReRBsnFGRKESZeb6u9+2Af/cG8O4OxAOiyqRTQALAZwloh8MxAs+lX/i649j19tRjXjwwGsG6FxGH05K9iXWRr7KMmjAWwecW/quM4WkZW6t31/ZUh2RkjWJ3mahv61KrWRh1VhVIfe90D9fDQjDPAreo2XphncPWL+tpsjwkjTDtKXShC5BuFo0+pSIfn7EtrMz7OsNsF9Rf0rCyO1Gao2M80jEpsQEP057M3QTriqOfrvCqI3JpNcmjKjGKO5MN0C1TGQTOb4IJkxlsmca/vAZ7SjaxNGfE54AhfsxQ9GRoMZTdqzidnMTMPHRga5GBM7Ou/e4xnSiU0qInWSuwM4E8Db9U+jGHOalYWZ2HYVkftIbgBgIYC1ApOZvS8F8LcisoSkeDn1gTOZCYB1AMwHsDHGgj+KmBMI4K8A3qjveCWYrML2CN18TKu5LDmOjpkVLagomrjll+qvKG2aDWA7jLUmaQa7ZqaIvNPoXnqcIkIVhOYC2CIwhxXZ5yMAtgHwmI6fA7ZXCtHsrHHX2iUeymQOBvADJSQjet9OaRbhBDab+KllNqOjJzCb9QxlMqMR+8MizC4RkWcnehROQFR75v8h+Zbg7IwAeB7A0yKyQolnX5m6Eq56h76rCcbvj2AyRnvqGPMtZu5zknUAnwDwuoh9bmO4UplMtegeNwYzSBGOWUy41sZhMOJxMYCPBxPWaR9JGMb8YgazMUL0UwDLPBxwIAlng+S6AE7S9YsJAKgCeA7Av+u96hN4nozAWJOtnQGsDWAXJA2y6hFzVxSTAOyd+uwcAF8hOUlEhjUh+qCCzx9VpnWliHy/nfOY0oSPAvAu1YSrBTTgVQCOF5HHA03DfMiTAfxzYA0pKuzcJCJ3Nmls1tDnHBVhMTJ6thLAVwNLTpH5eWluVVg4EcAGnbJWRQiCVQB36ut3KhC2l2aSSqK8KLBDdrrwoZVsWGQdFLWUw4pUcyizgf6rXuPBAINFQK3UyhdLZP+n17Y6Qeco7H8yRe37d/WwmGgjCL65whKrdd020lptsdg+/d3KSMb6/rMSz782vWcCuvWByJpmo5rQ+da8Ir5BgvlOOl/1iORPkrwiHGOreQmY5i4krxqgsk1zSO4dCArxGk1Kk/m2qogjXdBiEEguc0XkEf3s3QDWyHmmM5jBlNLNfPAFFLdXm6RXQxLObNoMOzSmSg/MrI0i5gyT/LSqwAwkbYK3TEmMXV8q1WyeA3CympYma8LgsQDWVA2hFb2oqyQ9F8CD7Ui1gYnrrQAORJLU28oPYSHwq3Qe0+tOnedTIvaSadVPicj/NlkT0XX8ks5XvcAeM41qhWqQLfd4MC8VkicAOFfHR/Rf2yeA7QHcTnJ3EbnbxluLPaDKZC4E8MkuMplw4HcHzv1mEznVSfvAoaKHYh8AG0YyGjNXfFtEnmvXJKqSNYN91NdDGVbNILkbEh/nVoH5yRhitcvnyzLRHwdwqIj8RaXqYQ2+OUGvGyq4dlUkeSD1DuWBfEnHV9RhPwnAf4vIwylfgQnI/whg2wImuFDgrQC4OFyzHOK/E4BDIkycNoarRWR+lm8j5zm767wcHDCYapf3SlGYj/5LJN9TRqMxx/+FAD7VAyZjdsardZI3wJgvqJba2HUAt8bYNx09IaQNkmsiKdURQ3RMilwK4Px2fTMpW/bGKnVNR/HIt1hNvALgMRG5rEkEpJ2nbyBJaq5izL/RixD9Bsb8n5cj8WesMHOH+hqOB7Aeijm1TYJ/EMB1al6ql1yvUJsp6hsy7WAlgLMytAPThN4TMNhKwX34FwDfakJfJMUURwvu8WbjzRNK9gNwHYBpGCvdNEgm5SGdo3cD2E5E5hQ2eQd5LBeWLIAYC7NbfjWwq36oxbM3atcm7OgoozH7+okl9oyt/znh/ivD7IJx7KC931/oka06t8d70H/mm6mWF70qBDocJEVfEq5ZkHC4HslnI8rbm7/jH+w7tiMY6Biuj/Cl2J75YXreg+/1em0814j0n5yY952C/bVjRHJmeO/v5+2TjD38nYx+XIPal6mhGl4x32pA6M/uEZOx0u9LgxLcU0nODBxz4eZukPwNyTVjqkM7uqvN6GuadpOMOYBGBJ7X9hBSRnhIOdhPzahSMdyF10p9nxVIonnn6Z1tBNK00x7BsCBw2tbC2l/6fnrEebdz+IAmVVc7IKDsllHfrtWcrCK5dXrPBHN+eURAihHLv3CsTXOz9fxpZLBLneSLJLdifgvosPPspYFwMBL0QOpmG4xGGzScJHctxGiCMtq7KeEf6XIkTMipPxWM4ws5i2i/n9aO5OvoujYTI30ZMTyr7JoGz39N0AsktuRNO5r4YVkHLBWZ9EyJ89QJzWcuyY9ZS4MUQTYBYR0tNBmrzbyvg9rMDW1oM7WMOd9SiXRsNNgX8/ZhoCntkGJOsdpMXimbKsm1SF7TR+2kjBDUIPkgg4aU0spZqfa/OwDshu7E8Yc2S3MAHyci39JxbAfgHrVn1rB68ibVjv8mAE8Hzl5Hf30zQNLO4V4Ar9E1K5pTQCQJg28ss6ZBefbXA7gNSbHVkdTe6QbMR/E7AG/RZ6029sA5/isAe0aep9CncK/6DYpE4pkv4DkAlwK4R0RWGREOo8IC38gZAL5c0Ddjvp4HAOyu/9Mocw6D5++KpP1Do8DeYeCE3g7AQ+r/aqT2w+UAPlLwO9mcPaH3XGp+q5y9dg2AQyPuDb12WwAPh+PNmIvDARwLYAl6F1lr+2o6Vq/CUvQcVJEE8RzbKsAh9MucXrL7YVlN5nh97hQ1md2ZU/TOrj+jXSnK0RVt5pAS+8auPbvMmgZmjC1JPtEjU29aqn9P1tiDse3TRkHRWZoDUu3EGmVI0BU1Vz8VIZ2ntZlOmM1uiNg7phX+dxNt5nVB/l3MfF/azDej994+UtO08X5v0OkWybepZlt0L5iJ/Fk9g83N3oEKvSHJxV12VoZ+F2My0/T9czmH0v7nGZKv1g3lQQCDxWiuz/CpFd2km8SuKVfvlviI3mulHuwYP0ujDSYzS00/lSaE6fZIZ66du1sCc5cEAQW1iFeuDzNghDGCpdnx78373jH7Rr/XLpE+PbvuqAxGUy3hmwnNP29r4j+xe18TeW/bX39XhDEHa93Oa0hf4c/hZ1mvyfr8OyMEI7vmjrRZtpVkeEaXtZl6MLjP6DOn6vvHmzx7JGXHrzqJHygms2ckkwk36Tmxa2pMSTO3V/TBjm1a05ez7PkBEd07Upsxp+xs1fClGxJwoM1sGqnNjKQi7God2Dsx2owJwAt0fsJWJaFvZnmJ73RtQW1mOGI9bQwL1PdSuFJ2sMcrOQwjzTyG8gJS0par4H72bgLNjkHAQYwm+L70Xq3lSIYNkmsDOA5xtalibdp238+IyAUkp2os/8cBXBz4bLJswgsAXGDjdTI/ELDInFMK+g/Sa/osgG+WWVPNyt4UwBlIauKV2bMNHfuGEXZpq2CwEsAP8nJ+NC/lDMRXN6gCOFVEXiQ5JCIjXVg3S2bcDknR06JZ7RX1p90ezF9ZJtMguQuSKgB1FG8UVkXSCO9F9Qc0xqZcGiRPQZJzUuQ7AWMN0c5J+VRWe66u5+nqNymaSGxzdqaILEuNN8/faUUzR1P7tOi5oJ6L50XkeZKvCnw9K0TkrznP3hTABzGWLFvk7NQA3A/gx/rs0VxGExzaKwGsj84HAFiyVFUJy5kpJvNRZTKjOc+1L3SciDzdarEcPdNmrGrEHgDeGawTIjbppSLyVGwVAFt/EflxB77H5zAWlBBTcPFiEVmYZgYBEd0bwF6Iy0ivIknOu0XnZKQL62aJtRsDuBDFqzfY9/6hiDzS0unbYhgB4a4WJNw2P7cDuNrmOSUsbw3gfRFMxmjddSIyi9mtAGw9t8dYMmnRCs0VAPMA/DQcb552p8+2AquvQVJcVJBUZVmzwB7dGsAyAO8A8ATJJ5EEN0zTvz9D8saM/1sLwGHBnMVUUDhb1zI/YTfD9NFpk1mogt2kkweSU/T9mJTDLM9EcaKbzAbPbKZq/S8izUOhb2bDvHyFiDEMRb5qgdnl5EhTsfko7tPAlZf5QALf0W0R82JzsrydXKKCc2Zm8i+XGN8ykn/TzvgCmrNrhBnKnr9UmcnLEjT1/bIS6zkc5H9UmvgCry5hBiXJI5qY5NL5P69W98VP9Hz0I/Ey5rvdX9Q3Ywv0bx2O2GkE91pE8qSMhTsmdXjTsOqyF7ZrD3Z0zTfzthKx932t0Bz4J9Yi+XhE7kh4wA7L2pPBvOyTkTBZxNb99SyfTxcEhKo6fYv61WzN/qODvpmYKgBpp3NWpNk2TKpAxEbPXZe3D4N7bx8kTsbmlkxpJpAE++V6kn/OSWYeKfgK91w9g7Y2u1c7+WO1Imo0SD4cydGKDIJMem1vmdJi1iJ5bYuEJ7vH71XCq9GjzAaJ0ViS3cwS2kyD5F85VgWi0icm+YUSkUnUiKuhPMKk778soS0s1Qi6bmoz9t33jzjvtmYvaPBAO9qMzc/uJZ3OM5gq2x9oaJeW1GZ2bsJobL4+V+LeJPnhrHsH992Y5I05ASG9ahlRxkrVYNIeoHWkaBBJcaCGhY52aABkUsbhxOBZQ8EG/02LQ2iL+Qe1I3s9s8EzmYlGfMUKJyMpbabW47Fb9vW6qs3EhPGna3vlEY/99J6xROm8bmt4gbkzRpsZ6bM2Y8LoH5TBVzI0jjcyKe8SG2n2syYmM9sr65B8LCIEezQY76T0vYM5OEZzVvK0Dw4wo4nSZspIX3kSz0gwYT8h+Wa99xrB8/4xR+vJkhr/oNES7pcZXLPZzBL5BA21PW/UJ23GpN/Pl7C310nebcS6CQO+tYQ2s5jkZt3MD0sxwpjxNVQQbUvbCp6/e0mz4pEZZjNbz/NKaBwjTEoD5TU2s3t/NnKvNB2vPu+YHD/2eGAyVuOuxoLFMytMCuLNKZEDwYz/uZpJme+0FrMJV69jNNoiRv4BZzIDbzLbPZUTVdQ302DSQK/ndeoC38x6HCv82YgkHjNa+Gb2jTxLdt/zu63hBWP8dcQY7ZoL2l2zgHBfH5k30yA5L+3nCNZzDRVMi2rXaW2mWdWEdZlUnCiqzdg1czPGa/O/RUrIiM1BLPLK8tvkFVstEyxQWJsJnbn1Eg8Or/8jNfkyg4Ofo9JaK4dxqBXt7M7/gWU0lZLaTLhJD+xTEEBZCdXOxzwlEpJhDqkpYSqrzbym25Fmev/9IphMqM38bbu+Gf3/PSPNrSMpX0eWNvPhEutZVJs5oaQ2c0TqPmaGe5X6+GJNtoOg9YTazKRW5zdNvF+LsYSlIrDYaYsJ/y8AHxORF6j5BJpbcSiS1qp7pP4vcx9iLDb9WBGZzTa7Kzq6JhE3VGvdD8XzCYCxfIVfA7ip1+vLsdyRNQD8E+KKBo4iaTb1Dc2bWW3sTHIvRpl0Fd0PxfNmbP6+LyKL2F5eSstzG+StFE2stfFdKiJ/bHPNLOfq6AL0IKQ1VSSJ2lcqkwvnp8GkbMppEetpicJ/QdKwDRl5M7ZX1gZwcuS9qwDmA7gqNV7bI6cD2BHFm0iGyfO/y6HTNr4/A1gOYAMAs5EkUtaQNK2cmvoegqSI7eSINbRip2eIyHBRs5lpNEUlsHoqbO4/Se6YYSZ7Hcnvpjh8o4BUR5KfzHPMOQbDbKbvZYqu2h7Yr0/ajO33r0dK1CZ5zlepvprl3FWJ/bYS2szzalruRaRZTJBCmNezRZvajEnz63Gs8GmjQ9rMkZF78aVCvjqurFYAQx3WZkyb20zns6jT3557Kcn9u7Av5kacBbvmviLaTNbm+3mByQwHcheTDNnwkFmhv6+QXBKp7lnC1if7Ybd3RGkEllC2KCK6J9xbt9te6TWT4eo9RGKie4x4HNrCN7N3JAMb7qFvxsydd5TIW7mgXcEgINwxvYpsjR5KR24F/pOa/j3Gf9Ig+Sfm1B3j6v15FpWINFuQERlnDOfCyO9PkndmfO8ir7D4avj5kL7vGxlpbN+veDfVgMO+iUmmbx7RCG2580l+gkk/+NAmbZvokxmaT9FDbJt5spP0gddmDi+hzdh+OKDX2ozuc6tKe22JsGOzSVeZ36JZVJuJ9X0s64Fvphr4RmK1mWc7oM0YYdue5HNB9F5sHkontBm753F5xFLHK0rrytz7QznazKYtaG2e726HkM528BzH+BLT4eXR2sxuTaSw8LMHSL46LSGluOwmqcE3CixMnUnm7Ea2wE7SB5bRVAINuMH4Mhy/4lil2EqPXrXgYH2rRChp0+zngIhPL+ngPq8H2oyd9XNKSNO3pITK8CUFJO1JwTW/iHx+nUkS+ZQm0WbzS2gzTzDoAtlkvq4roX0tSI83uF8ZbebMFPNr5yxIoBTs1aZCEM1o3pizUHbjFUxqQQ2F0lsTs0qF5EdTC9vKHPfebh82R0cZzawS+SckeWsfx/7ZgHjFmvt+z/wqAHaOymgzKziWZS/dWjO9/+aqTcQmMx7ZSjpudW5J7kzyf0rumWbazFElNY7jm2gzYX+cGEJcb+Gb2YpJ1YdY38zOXdgTa2r0ZFEGHfrqNovZr2F720P050YQvWCRJo8COEhEFhgzyYs40WgW0Z8vI0kAlwURHlnRGRUkrWB/xmZVPx2Dhthqwra2+2jEzXeDz7oF07gPBbCP7vMiUU4IzgEBrEISdTSa/l8lJnWS0wHsjfgKzReLyJPsXhsAPY7SILk7xqqyVwquGQGcSfJRAE8GdIJ638eMHmjO25Rg7hsANgNwOIAPA1gPxSvC2/zcCeAnIW0IosGGMBY5WCl4zwqAxwB8PyN67aVlDSLzKiheUdpamFydomUWabcXgLX1fjFCxTYkn+nAebFosXUBnArgDZFzVwVwrog8wVQr8KJ2uutzIsO+QXLzkMtH2MNN+5nRxB5rz/s312bGnUZzZwkTVFb0WaOLr3RUU2zBQCvmelET6TddoXkkUpvpak2zlMY1s2RCdtaamVZ0O8nv6WtJk7kvY64cYXaF5na1mc/kmX6CudqFcTXYMrWvwNQ1TSO1YpMz2cFzkl6T7lRobsJofqQ3elHfn2PSqAmlbhw41PT9xzkbzb70du08x9EXRjO7DaLVrdbgnUx0M+J1o5oZahmRSUaUpnMsC3ugfDOpcd5UUjiIqZyQ9b8jLFfV+9gMk5kR7inqlI71zfyRTTpcBvv7hhJO8rlMqhNk+Wb2Kzn33UKM0GUC13stkq2MWSFUkScDeBrAdBH5F3PYttFcjLpwPwhMEYa6qnG/BfAovYnZeIEdzkcQ10kzb+/1AlXENfAbUbPxzwEcKiLLAdRFhBmmNQA4Xe9ftCtnBcAzAM43M9A4WPO871ZXU9Bozl6QlJm+yNwPAZgJ4LsZ5nSjE+8H8KYIU6iZts4TkWVqzmKaIauJcTcAb0d+A8asNRUAvxaRleZGyHg+B2hNiwo3w0iSlC8Tkat13uplD/sIxrJk9xWRPwTZ/e0cgrpO7h0AFmKsikB4SJ/Rg+yRZuMLZ+m+4YAdoLaEfyUuQ8pkDtHM52ZEaR8A0yOIkhHG+0XkMT24vWI03ThjVSVatQ7cf1XAZA5Wot2wuVemTJLrIq6qg/kXHgdwaRPfjOFUHUdRwQEAXgBwro2xh/PfTRiTmQfgX9ikM2hRRrMOgCXKZOayQ61jbYOIyBJdiKyJ7lq0jaMLlEqkroT3QQA/1AM5PM6ZTSMQtmoAbkQSOFAvoNGfFqnNCIDn9eBKj+fN2jUPWsCNtS2eDOAmAAcDGM1g8KLS9FZIyqbEtJ4WAF8XkRVNtJm6Bky8C8WDFuy6q0Tk4bTgYOcFwN0A7tVx1MfBebByS/MB7Ccii5AEScQLRYH98AKd4I7bi4MM2wUp+7zZKt8RjsUxDsT+ZD3T/r3x1EcjTEIO7ftLmLSweClXocW52bdkHsK5vd7zQR7FvYHdvd7H9arz5QUlvxIk1Wa1X7A9dwWLt5u37/i4+nUkL29G/xbTH8f20DImJbekxbjfG/jC6wN6HsLv/R2Sm3R8r3bDGR84xWZlMBqzhzqjGYfMJmA6J3H11t/pkuSNATlAozlO+ydJftUOVfj98hiNEu1bIh285hTf2xJJe8xorArIFRnjqndpzeoZc58msr8keVAomLYYfwyDtLU+IU+Q5urdPsu0drisFQ0L9sy/55yTRh8Yfd55uI/kB7vCF7pY+sK4+UdTESW2mPs4oxnXmo0d0j1I/lSJdrPIr16/8rCYST+WQ1JRTdWCVoC99P6rCo7DNIi7mNMwrVfCgf58NJP+U6sKROt1Y/7nKYN5V5pWtKAjV+g8vljg2VY/8UmSU5tpM/r+P3p9kXuP6P1fYGTrBCbtDB7s8xlJYwXJS0i+P4yY64RbQ3q0uWuarPQRAJerLdxs2vMB7AVgsdr/6OR7XDKcWpC0tx6A/QEcDeDVau/dGokfsF+YjTEn/N0AbgcwR0T+L0VsGs32oB66ivoS7gCwU4mxvFtEbmB3WwG0FCjN1s6kMO4eAI7SM1lR38cWSMrMt4uFAJ7Ve48A+DaAZ0Xk5+l5zZsP85OR3FXXLxYniMg3mdHeIPDNHADg5hL3vlxEjmHB1gnBd6kAOBLAp3W+d0ZvgwUWAngOiaP/WgAPicjvs870eGM0MwB8Rzeb9bG5VUQO6Nehc3SPgKX+tgWALRHX+6XtIemzlorIPS0YR6OIkKNVMUhyGoA9Ee/UXSkivxmQ9WrKWEluBmCbNtbM/u8ujSrNnf9WZz+Y9zcA2DRyTA0At+c5sYN7vxnAqyLubdc9COApaPWFWMEs+Owtyti7fUbs/veIyNKMMyzjkhYHKu+MwHRmqtts5nS2c4xrc9pqxRcHgQny5WXTK/2an0ETEAL/QVfWLKPAqZ93rOa3qfT5XHT1PPS63EtWwtJdKk34rpsgUAl5NEtS6uOY6t0gEoMyljbnptFEQ+3EmjVSz2i0MeelxlRkztv4vo2yJv9wXH04I+G6dDWPq9eMZmowkbYwVztpfkUwn8YE/E51X7OJM6Z+f9+JXBWlV+qaTeBvkSSqVQNGsw4cDofDMWHRE0ZjnFpE5iCpPmAq4jCApb4MDofD4egI1OEU5ljM0c+9/IzD4XC4RtMRpIMBPALA4XA4nNF0Fd7kzOFwOJzRdBWXDcg4HA6HwzFBGc1T+u4+GofD4XBG0zFYqHMdg99V0OFwOBzjCVrq4GmNOHu0lyXSHQ6HwzHBNRot10EkVUIBYLhTlUEdDofD4YwGGGudeg/GWrY6HA6HwxlNx7E+khI0Pww0HYfD4XA4o2kb5vh/AMBMAI/o7x5x5nA4HI7Og+Q6+u6MxuFwOBwdZTAD0QjL4XA4HL3B/wNHzNSQJ78qXAAAAABJRU5ErkJggg==";

// ─── DATOS ────────────────────────────────────────────────────────────────────
const EMPRESAS = [
  { id: 0, nombre: "Independiente",             color: "#6B7280", inicial: "IN" },
  { id: 1, nombre: "Energía de Miajadas",        color: "#cf142b", inicial: "EM" },
  { id: 2, nombre: "Miajadas Telecom",           color: "#e0ad12", inicial: "MT" },
  { id: 3, nombre: "Laura Otero Instalaciones",  color: "#0077ab", inicial: "LI" },
  { id: 4, nombre: "Zaqaru",                     color: "#af4a85", inicial: "ZQ" },
  { id: 5, nombre: "Laura Otero S.A.",           color: "#4F8C0d", inicial: "LO" },
];

const USUARIOS = [
  // ── Independiente ──────────────────────────────────────────────
  { id: 0,  nombre: "Miguel Manzano Otero",      empresaId: 0, rol: "director"      },  // Director General
  { id: 1,  nombre: "Eugenio Manzano Otero",     empresaId: 0, rol: "ceo"           },  // CEO
  { id: 2,  nombre: "Jesús Salazar Otero",       empresaId: 0, rol: "trabajador"    },
  { id: 3,  nombre: "Iratxe Plaza Castaño",      empresaId: 0, rol: "trabajador"    },
  { id: 4,  nombre: "Yolanda Jiménez Núñez",     empresaId: 0, rol: "trabajador"    },
  { id: 5,  nombre: "Laura Hernández Hoyos",     empresaId: 0, rol: "trabajador"    },
  { id: 6,  nombre: "Rosa Garrido Marroquí",     empresaId: 0, rol: "trabajador"    },
  { id: 7,  nombre: "Fernando Flores Manzano",   empresaId: 0, rol: "trabajador"    },
  // ── Energía de Miajadas ────────────────────────────────────────
  { id: 8,  nombre: "Ángel Fernández Mogollón",  empresaId: 1, rol: "encargado"     },
  { id: 9,  nombre: "Jose Manuel Fuentes Vicente",empresaId: 1, rol: "trabajador"   },
  { id: 10, nombre: "María Manzano Soria",        empresaId: 1, rol: "trabajador"   },
  // ── Miajadas Telecom ───────────────────────────────────────────
  { id: 11, nombre: "Valentín Pérez Sánchez",    empresaId: 2, rol: "encargado"     },
  { id: 12, nombre: "Esther Albalá Fabián",      empresaId: 2, rol: "encargado"     },
  { id: 13, nombre: "Aitor Segador Garrido",     empresaId: 2, rol: "trabajador"    },
  { id: 14, nombre: "Carlos Cintero Díaz",       empresaId: 2, rol: "trabajador"    },
  { id: 15, nombre: "Javier Acedo Iñigo",        empresaId: 2, rol: "trabajador"    },
  { id: 16, nombre: "Sara Márquez Pérez",        empresaId: 2, rol: "administrador" },
  // ── Laura Otero Instalaciones ──────────────────────────────────
  { id: 17, nombre: "Miguel Calvo Calvo",        empresaId: 3, rol: "encargado"     },
  { id: 18, nombre: "Juan Antonio Fuentes Vicente",empresaId: 3, rol: "trabajador"  },
  { id: 19, nombre: "Jaime Naranjo Sanguino",    empresaId: 3, rol: "trabajador"    },
  { id: 20, nombre: "Pepe Saavedra Pizarro",     empresaId: 3, rol: "trabajador"    },
  { id: 21, nombre: "Ekaitz Pereira Grande",     empresaId: 3, rol: "trabajador"    },
  { id: 22, nombre: "Charly Llanos Lorenzo",     empresaId: 3, rol: "trabajador"    },
  { id: 23, nombre: "Borja Llanos López",        empresaId: 3, rol: "trabajador"    },
  { id: 24, nombre: "Oscar García Godino",       empresaId: 3, rol: "trabajador"    },
  { id: 25, nombre: "Carlos Pablo Pajuelo",      empresaId: 3, rol: "trabajador"    },
  { id: 26, nombre: "David López Babiano",       empresaId: 3, rol: "trabajador"    },
  { id: 27, nombre: "Manuel Lobo Meneses",       empresaId: 3, rol: "trabajador"    },
  { id: 28, nombre: "Luis Collado Pizarro",      empresaId: 3, rol: "trabajador"    },
  { id: 29, nombre: "Félix Loro García",         empresaId: 3, rol: "trabajador"    },
  { id: 30, nombre: "Andrés Medina Nieto",       empresaId: 3, rol: "trabajador"    },
  { id: 31, nombre: "Jairo Miguel Masa",         empresaId: 3, rol: "trabajador"    },
  { id: 32, nombre: "Francisco Babiano Ruiz",    empresaId: 3, rol: "trabajador"    },
  { id: 33, nombre: "Antonio Díaz Álvarez",      empresaId: 3, rol: "trabajador"    },
  { id: 34, nombre: "Guillermo Méndez Cortés",   empresaId: 3, rol: "trabajador"    },
  // ── Zaqaru ────────────────────────────────────────────────────
  { id: 35, nombre: "Riánsares Mañoso Blázquez", empresaId: 4, rol: "encargado"     },
  { id: 36, nombre: "Alberto Masa Mayoral",      empresaId: 4, rol: "trabajador"    },
  { id: 37, nombre: "Alberto Solís Loro",        empresaId: 4, rol: "trabajador"    },
  { id: 38, nombre: "Antonio Vellarino Garrido", empresaId: 4, rol: "trabajador"    },
  { id: 39, nombre: "Francisco Sánchez Melero",  empresaId: 4, rol: "trabajador"    },
  { id: 40, nombre: "Jorge Martínez Orellana",   empresaId: 4, rol: "trabajador"    },
  { id: 41, nombre: "Pedro Solís Bernardo",      empresaId: 4, rol: "trabajador"    },
  // ── Laura Otero S.A. ──────────────────────────────────────────
  { id: 42, nombre: "Jose Antonio Viegas Sánchez",empresaId: 5, rol: "encargado"   },
  { id: 43, nombre: "Vicente Manzano Otero",     empresaId: 5, rol: "trabajador"    },
  { id: 44, nombre: "Belén García Bravo",        empresaId: 5, rol: "trabajador"    },
  { id: 45, nombre: "Antonio Vellarino Maeso",   empresaId: 5, rol: "trabajador"    },
  { id: 46, nombre: "Daniel Pizarro Pizarro",    empresaId: 5, rol: "rrhh"          },
];
// Copia base de los usuarios del código (los 47 originales), para reconstruir
// USUARIOS = base + usuarios nuevos (Firestore) sin perder identidad.
const USUARIOS_BASE = USUARIOS.map(u => ({ ...u }));

const PRIORIDADES = ["Baja", "Media", "Alta", "Urgente"];
let PRIORIDAD_COLORES = { Baja: "#38A169", Media: "#D4A017", Alta: "#DD6B20", Urgente: "#E53E3E" };
const CATEGORIAS = ["Electricidad", "Fontanería", "Telecomunicaciones", "Contabilidad", "Legal", "Mantenimiento", "Instalaciones", "Administración", "Otro"];
const ESTADOS = ["Pendiente", "Asignado", "En progreso", "Completado", "Cancelado"];

// ── Sistema de permisos por módulo y nivel (Visualización < Creación < Administración) ──
const NIVELES_PERM = { visualizacion: "Visualización", creacion: "Creación", administracion: "Administración" };
const MODULOS_PERMISOS = [
  { id: "tickets",      label: "Tickets",      grupo: "Operativa", niveles: ["visualizacion","creacion","administracion"], desc: { visualizacion: "Ver e historial", creacion: "Crear tickets", administracion: "Panel de equipo + reportes" } },
  { id: "comunicacion", label: "Comunicación", grupo: "Operativa", niveles: ["visualizacion","creacion"], desc: { visualizacion: "Ver comunicados", creacion: "Crear comunicados" } },
  { id: "proyectos",    label: "Proyectos",    grupo: "Operativa", niveles: ["visualizacion","creacion"], desc: { visualizacion: "Ver proyectos", creacion: "Crear / editar" } },
  { id: "calendario",   label: "Calendario",   grupo: "Operativa", niveles: ["visualizacion"], desc: { visualizacion: "Ver calendario" } },
  { id: "nominas",      label: "Nóminas",      grupo: "Personal",  niveles: ["visualizacion","administracion"], desc: { visualizacion: "Ver la suya", administracion: "Gestionar todas (RRHH)" } },
  { id: "fichaje",      label: "Fichaje",      grupo: "Personal",  niveles: ["visualizacion","administracion"], desc: { visualizacion: "Fichar", administracion: "Ver fichajes de todos (RRHH)" } },
  { id: "vacaciones",   label: "Vacaciones",   grupo: "Personal",  niveles: ["visualizacion","administracion"], desc: { visualizacion: "Solicitar las suyas", administracion: "Gestionar todas (RRHH)" } },
  { id: "salas",        label: "Salas",        grupo: "Recursos",  niveles: ["visualizacion","administracion"], desc: { visualizacion: "Reservar y cancelar las suyas", administracion: "Cancelar reservas de otros" } },
  { id: "coches",       label: "Coches",       grupo: "Recursos",  niveles: ["visualizacion","administracion"], desc: { visualizacion: "Reservar y cancelar las suyas", administracion: "Cancelar reservas de otros (responsables)" } },
  { id: "perfil",       label: "Perfil",       grupo: "Personal",  niveles: ["visualizacion"], desc: { visualizacion: "Ver / editar su perfil" } },
];
const PERMISOS_DEFAULT = {
  tickets: { visualizacion:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46], creacion:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46], administracion:[0,1,8,11,12,17,35,42] },
  comunicacion: { visualizacion:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46], creacion:[0,1,8,11,12,16,17,35,42,46] },
  proyectos: { visualizacion:[8,9,10], creacion:[35] },
  calendario: { visualizacion:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46] },
  nominas: { visualizacion:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46], administracion:[46] },
  fichaje: { visualizacion:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46], administracion:[46] },
  vacaciones: { visualizacion:[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46], creacion:[0,1,8,11,12,17,35,42], administracion:[46] },
  salas: { visualizacion:[0,1,2,3,7,8,9,10,11,12,13,14,15,16,17,18,19,35,42,43,44,45,46], administracion:[] },
  coches: { visualizacion:[0,1,2,3,7,8,9,10,11,12,13,14,15,16,17,18,19,35,42,43,44,45,46], administracion:[8,11,12,15] },
  perfil: { visualizacion:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46] },
};
const RANK_NIVEL = { visualizacion: 1, creacion: 2, administracion: 3 };
// Construye el objeto de permisos por defecto (a partir del Excel)
function buildPermisosDefault() {
  const merged = {};
  MODULOS_PERMISOS.forEach(m => { merged[m.id] = {}; m.niveles.forEach(nv => { merged[m.id][nv] = PERMISOS_DEFAULT[m.id]?.[nv] || []; }); });
  return merged;
}
// Nivel efectivo (0=ninguno, 1=vis, 2=creación, 3=admin). Los niveles son acumulativos.
function nivelPermiso(permisos, userId, moduloId) {
  const m = permisos?.[moduloId];
  if (!m) return 0;
  if ((m.administracion || []).includes(userId)) return 3;
  if ((m.creacion || []).includes(userId)) return 2;
  if ((m.visualizacion || []).includes(userId)) return 1;
  return 0;
}
function tienePermiso(permisos, userId, moduloId, nivel = "visualizacion") {
  return nivelPermiso(permisos, userId, moduloId) >= (RANK_NIVEL[nivel] || 1);
}

// ── Carga config desde Firestore al iniciar ──
const loadConfig = async () => {
  try {
    const { getDocs, collection: col } = await import("firebase/firestore");
    const snap = await getDocs(col(db, "config"));
    snap.docs.forEach(d => {
      try {
        const val = JSON.parse(d.data().value);
        if (d.id === "categorias" && Array.isArray(val) && val.length > 0) {
          CATEGORIAS.length = 0; val.forEach(v => CATEGORIAS.push(v));
        }
        if (d.id === "estados" && Array.isArray(val) && val.length > 0) {
          ESTADOS.length = 0; val.forEach(v => ESTADOS.push(v));
        }
        // EMPRESAS y USUARIOS: siempre usar los del código, no sobreescribir desde Firestore
      } catch {}
    });
  } catch {}
};
loadConfig();
let ESTADO_COLORES = { Pendiente: "#718096", Asignado: "#3182CE", "En progreso": "#D4A017", Completado: "#38A169", Cancelado: "#E53E3E" };

// PINs por defecto (4 dígitos) — clave: userId, valor: pin string
const PINS_DEFAULT = {};
for (const u of [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46]) {
  PINS_DEFAULT[u] = "1234";
}

function genId() { return Date.now() + Math.random(); }
function fmtFecha(iso) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

// Firestore no acepta arrays con objetos anidados complejos
// Serializamos imagenes y comentarios como strings JSON
function ticketToFirestore(t) {
  return {
    ...t,
    imagenes:              JSON.stringify(t.imagenes   || []),
    comentarios:           JSON.stringify(t.comentarios|| []),
    completadoPorEmpresa:  JSON.stringify(t.completadoPorEmpresa || {}),
    fechaLimite:           t.fechaLimite ?? null,
  };
}
function ticketFromFirestore(t) {
  return {
    ...t,
    imagenes:             typeof t.imagenes    === "string" ? JSON.parse(t.imagenes)    : (t.imagenes    || []),
    comentarios:          typeof t.comentarios === "string" ? JSON.parse(t.comentarios) : (t.comentarios || []),
    completadoPorEmpresa: typeof t.completadoPorEmpresa === "string" ? JSON.parse(t.completadoPorEmpresa) : (t.completadoPorEmpresa || {}),
    fechaLimite:          t.fechaLimite ?? null,
  };
}

// ─── ESTILOS BASE ─────────────────────────────────────────────────────────────
let inp    = { fontFamily: "inherit", fontSize: 13, background: darkMode ? "#1A2235" : "#F8FAFC", border: `1px solid ${darkMode ? "#2E3A55" : "#CBD5E1"}`, borderRadius: 6, padding: "9px 12px", color: darkMode ? "#E2E8F0" : "#0F172A", outline: "none", width: "100%", boxSizing: "border-box" };
let btnS   = { fontFamily: "inherit", fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 6, border: "none", cursor: "pointer" };
let labelS = { display: "block", color: darkMode ? "#64748B" : "#475569", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 5 };

// ─── COMPONENTES BASE ─────────────────────────────────────────────────────────
function Badge({ texto, color, small }) {
  return (
    <span style={{ background: color + "22", color, border: `1px solid ${color}55`, borderRadius: 4, padding: small ? "1px 7px" : "3px 10px", fontSize: small ? 10 : 11, fontWeight: 700, letterSpacing: ".3px", whiteSpace: "nowrap" }}>
      {texto}
    </span>
  );
}

function Avatar({ nombre, color, size = 32 }) {
  const ini = nombre.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.33, fontWeight: 800, flexShrink: 0 }}>
      {ini}
    </div>
  );
}

function EmpresaTag({ empresaId }) {
  const emp = EMPRESAS.find(e => e.id === empresaId);
  if (!emp) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: emp.color + "18", color: emp.color, border: `1px solid ${emp.color}40`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: emp.color, display: "inline-block" }} />
      {emp.nombre}
    </span>
  );
}

// ─── MODAL CREAR TICKET ───────────────────────────────────────────────────────
function ModalCrearTicket({ usuarioActual, onClose, onCrear }) {
  const darkMode = __darkMode;
  const [titulo, setTitulo]         = useState("");
  const [descripcion, setDesc]      = useState("");
  const [prioridad, setPrioridad]   = useState("Media");
  const [categoria, setCategoria]   = useState("Otro");
  const [imagenes, setImagenes]     = useState([]);
  const [empresasDestino, setEmps]  = useState([]);
  const [comercialAsignados, setComercialAsignados] = useState([]);
  const [asignadosPorEmpresa, setAsignadosPorEmpresa] = useState({}); // para director/ceo
  const esDirCeoCreador = ["director","ceo"].includes(usuarioActual.rol);
  const [origenId, setOrigenId]     = useState(usuarioActual.empresaId > 0 ? usuarioActual.empresaId : 1);
  const [fechaInicio,  setFechaInicio]  = useState("");
  const [horaInicio,   setHoraInicio]   = useState("");
  const [duracion,     setDuracion]     = useState("");
  const [fechaLimite,  setFechaLimite]  = useState("");
  const [ubicacion, setUbicacion]     = useState("");
  const [geoLoading, setGeoLoading]   = useState(false);
  const [geoError, setGeoError]       = useState("");
  const [acopio, setAcopio]           = useState(null); // null=sin responder, true=Sí, false=No
  const [materiales, setMateriales]   = useState("");
  const [enviando, setEnviando]       = useState(false);

  const obtenerUbicacion = () => {
    if (!navigator.geolocation) {
      setGeoError("Tu navegador no soporta geolocalización.");
      return;
    }
    setGeoLoading(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "es", "User-Agent": "TicketApp/1.0" } }
          );
          const data = await res.json();
          setUbicacion(data.display_name || `${latitude}, ${longitude}`);
        } catch {
          setGeoError("No se pudo obtener la dirección. Intenta de nuevo.");
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === 1) setGeoError("Permiso denegado. Actívalo en tu navegador.");
        else if (err.code === 2) setGeoError("No se pudo detectar tu posición.");
        else setGeoError("Tiempo de espera agotado. Intenta de nuevo.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const empColor = EMPRESAS.find(e => e.id === (usuarioActual.empresaId > 0 ? usuarioActual.empresaId : 1))?.color || "#94A3B8";
  const disponibles = EMPRESAS; // incluye Independiente (id:0)
  const puedeCrear  = titulo.trim().length > 0 && empresasDestino.length > 0 &&
    (!empresasDestino.includes(0) || comercialAsignados.length > 0);

  const toggleEmp = (id) => {
    setEmps(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      if (id === 0 && !next.includes(0)) setComercialAsignados([]);
      return next;
    });
  };

  const handleImagenes = (e) => {
    Array.from(e.target.files).forEach(f => {
      if (f.size > MAX_ARCHIVO_BYTES) { alert(`"${f.name}" pesa demasiado (máx. 700 KB por archivo).`); return; }
      const r = new FileReader();
      r.onload = ev => setImagenes(prev => [...prev, { nombre: f.name, dataUrl: ev.target.result }]);
      r.readAsDataURL(f);
    });
  };

  const submit = () => {
    if (!puedeCrear || enviando) return;
    setEnviando(true);
    const asignacionesPorEmpresa = {};
    empresasDestino.forEach(id => { asignacionesPorEmpresa[id] = id === 0 ? comercialAsignados : []; });
    const tieneAsignadosComercial = empresasDestino.includes(0) && comercialAsignados.length > 0;
    try {
      onCrear({
        id: genId(), titulo: titulo.trim(), descripcion, prioridad, categoria,
        empresasDestino,
        empresaOrigenId: ["director","ceo"].includes(usuarioActual.rol) ? origenId : usuarioActual.empresaId,
        creadoPor: usuarioActual.id,
        estado: tieneAsignadosComercial ? "Asignado" : "Pendiente",
        asignacionesPorEmpresa,
        fecha: new Date().toISOString(),
        fechaAsignacion: tieneAsignadosComercial ? new Date().toISOString() : null,
        fechaInicio: fechaInicio || null,
        horaInicio:  horaInicio  || null,
        duracion:    duracion    || null,
        fechaLimite: fechaLimite || null,
        ubicacion: ubicacion.trim() || null,
        comentarios: [], imagenes,
        acopio: acopio,
        materiales: acopio === true ? materiales.trim() : null,
      });
    } catch (e) {
      console.error("Error al crear el ticket:", e);
    } finally {
      setEnviando(false);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "#00000099", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: 20, overflowY: "auto" }}>
      <div className="modal-box" style={{ background: darkMode ? "#111827" : "#FFFFFF", border: `1px solid ${darkMode ? "#2E3A55" : "#CBD5E1"}`, borderRadius: 14, width: "100%", maxWidth: 560, padding: 28, boxShadow: "0 24px 80px #0008", margin: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: darkMode ? "#E2E8F0" : "#0F172A" }}>✉️ Nuevo Ticket</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: darkMode ? "#64748B" : "#475569", fontSize: 24, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelS}>Título *</label>
            <input style={inp} value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="¿Qué necesitas?" />
          </div>
          <div>
            <label style={labelS}>Descripción</label>
            <textarea style={{ ...inp, resize: "vertical", minHeight: 80 }} value={descripcion} onChange={e => setDesc(e.target.value)} placeholder="Explica con más detalle..." />
          </div>

          {/* FECHA Y HORA DE INICIO */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelS}>Fecha de inicio</label>
              <input type="date" style={{ ...inp, colorScheme: "dark" }} value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
            </div>
            <div>
              <label style={labelS}>Hora de inicio</label>
              <input type="time" style={{ ...inp, colorScheme: "dark" }} value={horaInicio} onChange={e => setHoraInicio(e.target.value)} />
            </div>
          </div>

          {/* FECHA LÍMITE */}
          <div>
            <label style={labelS}>📅 Fecha límite de resolución</label>
            <input
              type="date"
              style={{ ...inp, colorScheme: "dark", borderColor: fechaLimite ? "#E53E3E88" : undefined }}
              value={fechaLimite}
              onChange={e => setFechaLimite(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
            {fechaLimite && (
              <p style={{ margin: "4px 0 0", color: "#E53E3E", fontSize: 11 }}>
                ⚠️ Si el ticket no se completa antes de esta fecha, aparecerá como urgente en la lista.
              </p>
            )}
          </div>

          {/* UBICACIÓN */}
          <div>
            <label style={labelS}>Ubicación</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 15, pointerEvents: "none" }}>📍</span>
                <input style={{ ...inp, paddingLeft: 34 }} value={ubicacion} onChange={e => { setUbicacion(e.target.value); setGeoError(""); }} placeholder="Calle, número, ciudad..." />
              </div>
              <button
                type="button"
                onClick={obtenerUbicacion}
                disabled={geoLoading}
                title="Usar mi ubicación actual"
                style={{ ...btnS, background: geoLoading ? "#1E293B" : darkMode ? "#1A2235" : "#F8FAFC", color: geoLoading ? "#475569" : "#94A3B8", border: `1px solid ${darkMode ? "#2E3A55" : "#CBD5E1"}`, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", flexShrink: 0, padding: "9px 14px" }}
              >
                {geoLoading
                  ? <><span style={{ display: "inline-block", width: 13, height: 13, border: "2px solid #475569", borderTopColor: "#94A3B8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> Localizando...</>
                  : <>🎯 Mi ubicación</>
                }
              </button>
            </div>
            {geoError && (
              <p style={{ margin: "5px 0 0", color: "#E53E3E", fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}>
                ⚠️ {geoError}
              </p>
            )}
            {ubicacion && !geoError && !geoLoading && (
              <p style={{ margin: "5px 0 0", color: "#38A169", fontSize: 11 }}>
                ✓ Ubicación detectada — puedes editarla si lo necesitas
              </p>
            )}
          </div>

          {/* ACOPIO DE MATERIALES */}
          <div style={{ background: darkMode ? "#1A2235" : "#F8FAFC", borderRadius: 8, padding: "14px 16px", border: `1px solid ${darkMode ? "#2E3A55" : "#CBD5E1"}` }}>
            <label style={{ ...labelS, marginBottom: 10 }}>📦 Acopio de materiales</label>
            <div style={{ display: "flex", gap: 10, marginBottom: acopio === true ? 12 : 0 }}>
              {[{ val: true, label: "✅ Sí", color: "#38A169" }, { val: false, label: "❌ No", color: "#E53E3E" }].map(({ val, label, color }) => (
                <button key={String(val)} type="button"
                  onClick={() => { setAcopio(val); if (!val) setMateriales(""); }}
                  style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 700, padding: "8px 22px", borderRadius: 6, border: `2px solid ${acopio === val ? color : darkMode ? "#2E3A55" : "#CBD5E1"}`, cursor: "pointer", background: acopio === val ? color + "22" : darkMode ? "#111827" : "#FFFFFF", color: acopio === val ? color : "#64748B", transition: "all .15s" }}>
                  {label}
                </button>
              ))}
              {acopio === null && <span style={{ color: darkMode ? "#475569" : "#64748B", fontSize: 12, alignSelf: "center" }}>Selecciona una opción</span>}
            </div>
            {acopio === true && (
              <div>
                <label style={{ ...labelS, marginBottom: 5 }}>Lista de materiales</label>
                <textarea
                  style={{ ...inp, resize: "vertical", minHeight: 80 }}
                  value={materiales}
                  onChange={e => setMateriales(e.target.value)}
                  placeholder="Ej: 10m cable RJ45, 2 conectores, 1 switch 8 puertos..." />
              </div>
            )}
          </div>

          <div>
            <label style={labelS}>Imágenes adjuntas</label>
            <label style={{ display: "flex", alignItems: "center", gap: 10, background: darkMode ? "#1A2235" : "#F8FAFC", border: "2px dashed #2E3A55", borderRadius: 8, padding: "12px 16px", cursor: "pointer" }}>
              <span style={{ fontSize: 20 }}>📎</span>
              <div>
                <p style={{ margin: 0, color: "#CBD5E1", fontSize: 13, fontWeight: 600 }}>Adjuntar imágenes</p>
                <p style={{ margin: 0, color: darkMode ? "#475569" : "#64748B", fontSize: 11 }}>JPG, PNG, GIF</p>
              </div>
              <input type="file" accept="image/*" multiple onChange={handleImagenes} style={{ display: "none" }} />
            </label>
            {imagenes.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {imagenes.map((img, i) => (
                  <div key={i} style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: `1px solid ${darkMode ? "#2E3A55" : "#CBD5E1"}` }}>
                    <img src={img.dataUrl} alt={img.nombre} style={{ width: 72, height: 72, objectFit: "cover", display: "block" }} />
                    <button onClick={() => setImagenes(prev => prev.filter((_, idx) => idx !== i))} style={{ position: "absolute", top: 3, right: 3, background: "#00000099", border: "none", color: "#fff", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {["director","ceo"].includes(usuarioActual.rol) && (
            <div>
              <label style={labelS}>Empresa origen</label>
              <select style={inp} value={origenId} onChange={e => setOrigenId(Number(e.target.value))}>
                {disponibles.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
          )}

          <div>
            <label style={labelS}>Empresas destino * — selecciona las que necesites</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {disponibles.map(emp => {
                const marcada = empresasDestino.includes(emp.id);
                return (
                  <div key={emp.id}>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, background: marcada ? emp.color + "18" : darkMode ? "#1A2235" : "#F8FAFC", border: `1px solid ${marcada ? emp.color + "66" : darkMode ? "#2E3A55" : "#CBD5E1"}`, cursor: "pointer" }}>
                      <input type="checkbox" checked={marcada} onChange={() => toggleEmp(emp.id)} style={{ accentColor: emp.color, width: 15, height: 15, flexShrink: 0 }} />
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: emp.color, flexShrink: 0 }} />
                      <span style={{ color: marcada ? "#E2E8F0" : "#94A3B8", fontSize: 13, fontWeight: marcada ? 700 : 400, flex: 1 }}>{emp.nombre}</span>
                      {emp.id === usuarioActual.empresaId && <span style={{ color: darkMode ? "#475569" : "#64748B", fontSize: 10 }}>mi empresa</span>}
                      {marcada && emp.id !== 0 && <span style={{ color: emp.color, fontSize: 12 }}>✓</span>}
                      {marcada && emp.id === 0 && <span style={{ color: emp.color, fontSize: 10 }}>{comercialAsignados.length > 0 ? `${comercialAsignados.length} asignada${comercialAsignados.length > 1 ? "s" : ""}` : "elige persona"}</span>}
                    </label>
                    {/* Selector de personas para Comercial */}
                    {marcada && emp.id === 0 && (
                      <div style={{ marginTop: 4, marginLeft: 12, display: "flex", flexDirection: "column", gap: 4, padding: "10px 12px", background: darkMode ? "#0D1424" : "#FFFFFF", borderRadius: 8, border: `1px solid ${emp.color}33` }}>
                        <p style={{ margin: "0 0 6px", color: emp.color, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
                          🎯 Selecciona a quién va dirigido
                        </p>
                        {USUARIOS.filter(u => u.empresaId === 0).map(u => {
                          const sel = comercialAsignados.includes(u.id);
                          return (
                            <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 6, background: sel ? emp.color + "22" : darkMode ? "#1A2235" : "#F8FAFC", border: `1px solid ${sel ? emp.color + "66" : darkMode ? "#2E3A55" : "#CBD5E1"}`, cursor: "pointer" }}>
                              <input type="checkbox" checked={sel}
                                onChange={() => setComercialAsignados(prev => sel ? prev.filter(x => x !== u.id) : [...prev, u.id])}
                                style={{ accentColor: emp.color, width: 14, height: 14, flexShrink: 0 }} />
                              <Avatar nombre={u.nombre} color={emp.color} size={22} />
                              <span style={{ color: sel ? "#E2E8F0" : "#94A3B8", fontSize: 12, fontWeight: sel ? 700 : 400, flex: 1 }}>{u.nombre}</span>
                              {sel && <span style={{ color: emp.color, fontSize: 11 }}>✓</span>}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {empresasDestino.length > 0 && (
              <p style={{ margin: "6px 0 0", color: darkMode ? "#64748B" : "#475569", fontSize: 11 }}>
                {empresasDestino.filter(id => id !== 0).length > 0 && "El encargado de cada empresa asignará a sus trabajadores. "}
                {empresasDestino.includes(0) && comercialAsignados.length === 0 && <span style={{ color: "#E53E3E" }}>⚠️ Selecciona al menos una persona de Independiente.</span>}
              </p>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelS}>Prioridad</label>
              <select style={inp} value={prioridad} onChange={e => setPrioridad(e.target.value)}>
                {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={labelS}>Categoría</label>
              <select style={inp} value={categoria} onChange={e => setCategoria(e.target.value)}>
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ ...btnS, background: darkMode ? "#1E293B" : "#E2E8F0", color: darkMode ? "#94A3B8" : "#334155" }}>Cancelar</button>
          <button onClick={submit} disabled={!puedeCrear || enviando} style={{ ...btnS, background: (puedeCrear && !enviando) ? empColor : darkMode ? "#1E293B" : "#E2E8F0", color: (puedeCrear && !enviando) ? "#fff" : "#475569", fontWeight: 800, cursor: (puedeCrear && !enviando) ? "pointer" : "not-allowed" }}>
            {enviando ? "Creando..." : "Crear Ticket →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL DETALLE ────────────────────────────────────────────────────────────
function ModalDetalle({ ticket, usuarioActual, onClose, onActualizar, onBorrar }) {
  const darkMode = __darkMode;
  const asignacionesIniciales = (ticket.asignacionesPorEmpresa || {})[usuarioActual.empresaId] || [];
  const [comentario, setComentario]   = useState("");
  const [seleccionados, setSelecs]    = useState(asignacionesIniciales);
  const [adjuntos, setAdjuntos]       = useState([]);
  const [editandoFecha, setEditandoFecha] = useState(false);
  const [editFecha,    setEditFecha]  = useState(ticket.fechaInicio || "");
  const [editHora,     setEditHora]   = useState(ticket.horaInicio  || "");
  const [editDuracion, setEditDuracion] = useState(ticket.duracion  || "");
  const [editandoAcopio, setEditandoAcopio] = useState(false);
  const [editAcopio,     setEditAcopio]     = useState(ticket.acopio ?? null);
  const [editMateriales, setEditMateriales] = useState(ticket.materiales || "");

  const empresasDestino   = ticket.empresasDestino || [];
  const asignaciones      = ticket.asignacionesPorEmpresa || {};
  const todosAsignadosIds = Object.values(asignaciones).flat();

  const esDirector         = ["director","ceo"].includes(usuarioActual.rol);
  const esAdmin            = usuarioActual.rol === "administrador";
  const esEncargadoDest    = (["director","ceo"].includes(usuarioActual.rol) || usuarioActual.rol === "encargado" || esAdmin) && (["director","ceo"].includes(usuarioActual.rol) || empresasDestino.includes(usuarioActual.empresaId));
  const esAsignado         = todosAsignadosIds.includes(usuarioActual.id);
  const esCreadoPor        = ticket.creadoPor === usuarioActual.id;
  const puedeAccion        = esDirector || esEncargadoDest || esAsignado || esCreadoPor || esAdmin;

  const creador     = USUARIOS.find(u => u.id === ticket.creadoPor);
  const empOrigen   = EMPRESAS.find(e => e.id === ticket.empresaOrigenId);
  const accentColor = empOrigen?.color || "#3182CE";
  const miEmpresa   = EMPRESAS.find(e => e.id === usuarioActual.empresaId);
  const misTrabs    = (esDirector ? USUARIOS.filter(u => u.rol === "trabajador" || u.rol === "encargado") : USUARIOS.filter(u => u.empresaId === usuarioActual.empresaId && ["trabajador","encargado","administrador"].includes(u.rol))).filter(u => u.activo !== false)

  const toggleSel = (id) => setSelecs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const guardarFecha = () => {
    onActualizar({
      ...ticket,
      fechaInicio: editFecha || null,
      horaInicio:  editHora  || null,
      duracion:    editDuracion || null,
    });
    setEditandoFecha(false);
  };

  const guardarAcopio = () => {
    onActualizar({
      ...ticket,
      acopio:     editAcopio,
      materiales: editAcopio === true ? editMateriales.trim() : null,
    });
    setEditandoAcopio(false);
  };

  const asignar = () => {
    if (seleccionados.length === 0) return;
    let nuevas = { ...asignaciones };
    if (esDirector) {
      // Director: agrupar seleccionados por su empresa
      seleccionados.forEach(uid => {
        const usr = USUARIOS.find(u => u.id === uid);
        if (!usr) return;
        const empId = usr.empresaId;
        nuevas[empId] = [...(nuevas[empId] || []).filter(x => x !== uid), uid];
      });
    } else {
      nuevas[usuarioActual.empresaId] = seleccionados;
    }
    onActualizar({
      ...ticket,
      asignacionesPorEmpresa: nuevas,
      estado: "Asignado",
      fechaAsignacion: ticket.fechaAsignacion || new Date().toISOString(),
    });
  };

  const cambiarEstado = (estado) => {
    if (estado === "Completado") {
      const ahora    = new Date();
      const fechaFin = ahora.toISOString().split("T")[0];
      const horaFin  = ahora.toTimeString().slice(0, 5);
      // Calcular duración real si hay fecha de inicio
      let duracion = ticket.duracion || null;
      if (ticket.fechaInicio) {
        const inicio = new Date(`${ticket.fechaInicio}T${ticket.horaInicio || "00:00"}`);
        const diff   = ahora - inicio;
        if (diff > 0) {
          const mins  = Math.floor(diff / 60000);
          const dias  = Math.floor(mins / 1440);
          const horas = Math.floor((mins % 1440) / 60);
          const mints = mins % 60;
          let r = "";
          if (dias > 0)  r += `${dias}d `;
          if (horas > 0) r += `${horas}h `;
          if (mints > 0) r += `${mints}min`;
          duracion = r.trim() || duracion;
        }
      }

      // ── Lógica multi-empresa: marcar solo la empresa del usuario actual ──
      const empresasDestino = ticket.empresasDestino || [];
      const miEmpresaId     = usuarioActual.empresaId;
      const completadoPorEmpresa = {
        ...(ticket.completadoPorEmpresa || {}),
        [miEmpresaId]: true,
      };

      // Solo cuentan las empresas que tienen al menos un trabajador asignado
      const asignaciones    = ticket.asignacionesPorEmpresa || {};
      const empresasActivas = empresasDestino.filter(id => (asignaciones[id] || []).length > 0);
      // Si ninguna tiene asignados aún, usamos todas las empresas destino
      const empresasQueCuentan = empresasActivas.length > 0 ? empresasActivas : empresasDestino;
      const todasCompletan     = empresasQueCuentan.every(id => completadoPorEmpresa[id] === true);

      if (todasCompletan) {
        // TODAS las empresas han completado → completar el ticket globalmente
        onActualizar({ ...ticket, estado: "Completado", fechaFin, horaFin, duracion, fechaCompletado: ahora.toISOString(), completadoPorEmpresa });
      } else {
        // Aún quedan empresas pendientes → marcar esta empresa y dejar en "En progreso"
        onActualizar({ ...ticket, estado: "En progreso", completadoPorEmpresa });
      }
    } else {
      onActualizar({ ...ticket, estado });
    }
  };

  const enviarComentario = () => {
    if (!comentario.trim() && adjuntos.length === 0) return;
    onActualizar({
      ...ticket,
      comentarios: [...ticket.comentarios, {
        id: genId(), texto: comentario,
        autorId: usuarioActual.id, fecha: new Date().toISOString(),
        adjuntos: adjuntos,
      }],
    });
    setComentario("");
    setAdjuntos([]);
  };

  const handleAdjuntos = (e) => {
    Array.from(e.target.files).forEach(f => {
      if (f.size > MAX_ARCHIVO_BYTES) { alert(`"${f.name}" pesa demasiado (máx. 700 KB por archivo).`); return; }
      const r = new FileReader();
      r.onload = ev => setAdjuntos(prev => [...prev, { nombre: f.name, dataUrl: ev.target.result, tipo: f.type }]);
      r.readAsDataURL(f);
    });
    e.target.value = "";
  };

  return (
    <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "#00000099", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: 20, overflowY: "auto" }}>
      <div className="modal-box" style={{ background: darkMode ? "#111827" : "#FFFFFF", border: `1px solid ${darkMode ? "#2E3A55" : "#CBD5E1"}`, borderRadius: 14, width: "100%", maxWidth: 660, padding: 28, margin: "auto", boxShadow: "0 24px 80px #0008" }}>

        {/* Cabecera */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div style={{ flex: 1, marginRight: 16 }}>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 10 }}>
              <Badge texto={ticket.estado} color={ESTADO_COLORES[ticket.estado]} />
              <Badge texto={ticket.prioridad} color={PRIORIDAD_COLORES[ticket.prioridad]} />
              <Badge texto={ticket.categoria} color="#64748B" />
            </div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: darkMode ? "#E2E8F0" : "#0F172A", lineHeight: 1.3 }}>{ticket.titulo}</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {(esCreadoPor || esDirector || esAdmin) && onBorrar && (
              <button
                onClick={() => { if (window.confirm(`¿Seguro que quieres eliminar el ticket "${ticket.titulo}"? Esta acción no se puede deshacer.`)) onBorrar(); }}
                title="Eliminar ticket"
                style={{ background: "#E53E3E18", border: "1px solid #E53E3E44", borderRadius: 8, padding: "6px 10px", color: "#E53E3E", fontSize: 15, cursor: "pointer" }}>
                🗑️
              </button>
            )}
            <button onClick={onClose} style={{ background: "none", border: "none", color: darkMode ? "#64748B" : "#475569", fontSize: 24, cursor: "pointer" }}>×</button>
          </div>
        </div>

        {/* Info básica */}
        <div className="form-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div style={{ background: darkMode ? "#1A2235" : "#F8FAFC", borderRadius: 7, padding: "10px 12px" }}>
            <p style={{ margin: "0 0 3px", color: darkMode ? "#475569" : "#64748B", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Creado por</p>
            <p style={{ margin: 0, color: "#CBD5E1", fontSize: 13 }}>{creador?.nombre}</p>
          </div>
          <div style={{ background: darkMode ? "#1A2235" : "#F8FAFC", borderRadius: 7, padding: "10px 12px" }}>
            <p style={{ margin: "0 0 3px", color: darkMode ? "#475569" : "#64748B", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Fecha</p>
            <p style={{ margin: 0, color: "#CBD5E1", fontSize: 13 }}>{fmtFecha(ticket.fecha)}</p>
          </div>
          <div style={{ background: darkMode ? "#1A2235" : "#F8FAFC", borderRadius: 7, padding: "10px 12px" }}>
            <p style={{ margin: "0 0 3px", color: darkMode ? "#475569" : "#64748B", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Empresa origen</p>
            <EmpresaTag empresaId={ticket.empresaOrigenId} />
          </div>
        </div>

        {/* Fecha, hora, duración, ubicación */}
        {(ticket.fechaInicio || ticket.ubicacion || ticket.duracion) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {ticket.fechaInicio && (
              <div style={{ display: "flex", alignItems: "center", gap: 7, background: darkMode ? "#1A2235" : "#F8FAFC", borderRadius: 7, padding: "8px 12px", border: `1px solid ${darkMode ? "#2E3A55" : "#CBD5E1"}` }}>
                <span style={{ fontSize: 14 }}>📅</span>
                <div>
                  <p style={{ margin: 0, color: darkMode ? "#475569" : "#64748B", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Fecha inicio</p>
                  <p style={{ margin: 0, color: "#CBD5E1", fontSize: 12, fontWeight: 600 }}>
                    {new Date(ticket.fechaInicio).toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
                    {ticket.horaInicio && <span style={{ color: darkMode ? "#94A3B8" : "#334155" }}> · {ticket.horaInicio}</span>}
                  </p>
                </div>
              </div>
            )}
            {ticket.duracion && (
              <div style={{ display: "flex", alignItems: "center", gap: 7, background: darkMode ? "#1A2235" : "#F8FAFC", borderRadius: 7, padding: "8px 12px", border: `1px solid ${darkMode ? "#2E3A55" : "#CBD5E1"}` }}>
                <span style={{ fontSize: 14 }}>⏱️</span>
                <div>
                  <p style={{ margin: 0, color: darkMode ? "#475569" : "#64748B", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
                    {ticket.estado === "Completado" ? "Duración real" : "Duración estimada"}
                  </p>
                  <p style={{ margin: 0, color: ticket.estado === "Completado" ? "#38A169" : "#CBD5E1", fontSize: 12, fontWeight: 600 }}>{ticket.duracion}</p>
                </div>
              </div>
            )}
            {ticket.fechaFin && (
              <div style={{ display: "flex", alignItems: "center", gap: 7, background: darkMode ? "#1A223522" : "#F0FDF4", borderRadius: 7, padding: "8px 12px", border: `1px solid ${darkMode ? "#38A16944" : "#BBF7D0"}` }}>
                <span style={{ fontSize: 14 }}>🏁</span>
                <div>
                  <p style={{ margin: 0, color: "#38A169", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Completado</p>
                  <p style={{ margin: 0, color: "#38A169", fontSize: 12, fontWeight: 600 }}>
                    {new Date(ticket.fechaFin).toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
                    {ticket.horaFin && <span> · {ticket.horaFin}</span>}
                  </p>
                </div>
              </div>
            )}
            {ticket.fechaLimite && (() => {
              const hoyD         = new Date(); hoyD.setHours(0, 0, 0, 0);
              const limD         = new Date(ticket.fechaLimite + "T00:00:00");
              const yaCompletado = ["Completado", "Cancelado"].includes(ticket.estado);
              const estaVencido  = !yaCompletado && limD < hoyD;
              const esHoy        = !yaCompletado && limD.getTime() === hoyD.getTime();
              const color  = yaCompletado ? "#38A169" : estaVencido || esHoy ? "#E53E3E" : "#D4A017";
              const bgCol  = yaCompletado ? (darkMode ? "#38A16922" : "#F0FDF4") : estaVencido || esHoy ? (darkMode ? "#E53E3E22" : "#FFF5F5") : (darkMode ? "#D4A01722" : "#FFFBEB");
              const bdCol  = yaCompletado ? (darkMode ? "#38A16944" : "#BBF7D0") : estaVencido || esHoy ? "#E53E3E55" : "#D4A01755";
              const label  = yaCompletado ? "Fecha límite" : estaVencido ? "⚠️ VENCIDA" : esHoy ? "🔴 VENCE HOY" : "⏰ Fecha límite";
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 7, background: bgCol, borderRadius: 7, padding: "8px 12px", border: `1px solid ${bdCol}` }}>
                  <span style={{ fontSize: 14 }}>🗓️</span>
                  <div>
                    <p style={{ margin: 0, color, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{label}</p>
                    <p style={{ margin: 0, color, fontSize: 12, fontWeight: 600 }}>
                      {limD.toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
              );
            })()}
            {ticket.ubicacion && (
              <div style={{ display: "flex", alignItems: "center", gap: 7, background: darkMode ? "#1A2235" : "#F8FAFC", borderRadius: 7, padding: "8px 12px", border: `1px solid ${darkMode ? "#2E3A55" : "#CBD5E1"}`, flex: 1, minWidth: 180 }}>
                <span style={{ fontSize: 14 }}>📍</span>
                <div>
                  <p style={{ margin: 0, color: darkMode ? "#475569" : "#64748B", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Ubicación</p>
                  <p style={{ margin: 0, color: "#CBD5E1", fontSize: 12, fontWeight: 600 }}>{ticket.ubicacion}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empresas involucradas */}
        <div style={{ marginBottom: 14 }}>
          <p style={{ margin: "0 0 8px", color: darkMode ? "#475569" : "#64748B", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px" }}>
            Empresas involucradas ({empresasDestino.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {empresasDestino.map(empId => {
              const emp = EMPRESAS.find(e => e.id === empId);
              const asignadosEmp = (asignaciones[empId] || []).map(id => USUARIOS.find(u => u.id === id)).filter(Boolean);
              const haCompletado = (ticket.completadoPorEmpresa || {})[empId] === true;
              return (
                <div key={empId} style={{ background: darkMode ? "#1A2235" : "#F8FAFC", borderRadius: 8, padding: "10px 14px", border: `1px solid ${emp?.color || "#2E3A55"}33` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: asignadosEmp.length > 0 ? 8 : 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: emp?.color, flexShrink: 0 }} />
                      <span style={{ color: emp?.color, fontSize: 12, fontWeight: 700 }}>{emp?.nombre}</span>
                      {asignadosEmp.length === 0
                        ? <span style={{ color: darkMode ? "#475569" : "#64748B", fontSize: 11, fontStyle: "italic" }}>— pendiente de asignación</span>
                        : <span style={{ color: darkMode ? "#64748B" : "#475569", fontSize: 11 }}>{asignadosEmp.length} persona{asignadosEmp.length > 1 ? "s" : ""} asignada{asignadosEmp.length > 1 ? "s" : ""}</span>
                      }
                    </div>
                    {haCompletado
                      ? <span style={{ background: "#38A16922", color: "#38A169", border: "1px solid #38A16955", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>✓ Completado</span>
                      : ticket.estado !== "Pendiente" && <span style={{ background: "#D4A01722", color: "#D4A017", border: "1px solid #D4A01755", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>⏳ En progreso</span>
                    }
                  </div>
                  {asignadosEmp.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingLeft: 16 }}>
                      {asignadosEmp.map(u => (
                        <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 5, background: (emp?.color || "#666") + "18", borderRadius: 20, padding: "3px 10px 3px 4px" }}>
                          <Avatar nombre={u.nombre} color={emp?.color || "#666"} size={20} />
                          <span style={{ color: "#CBD5E1", fontSize: 11, fontWeight: 600 }}>{u.nombre}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Acopio de materiales */}
        {ticket.acopio !== null && ticket.acopio !== undefined && (
          <div style={{ background: darkMode ? "#1A2235" : "#F8FAFC", borderRadius: 8, padding: 14, marginBottom: 14, border: `1px solid ${ticket.acopio ? "#38A16933" : "#E53E3E33"}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: ticket.acopio && ticket.materiales ? 10 : 0 }}>
              <span style={{ fontSize: 16 }}>📦</span>
              <span style={{ color: darkMode ? "#64748B" : "#475569", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Acopio de materiales</span>
              <span style={{ background: ticket.acopio ? "#38A16922" : "#E53E3E22", color: ticket.acopio ? "#38A169" : "#E53E3E", border: `1px solid ${ticket.acopio ? "#38A16955" : "#E53E3E55"}`, borderRadius: 4, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
                {ticket.acopio ? "✅ Sí" : "❌ No"}
              </span>
            </div>
            {ticket.acopio && ticket.materiales && (
              <p style={{ margin: 0, color: darkMode ? "#94A3B8" : "#334155", fontSize: 13, lineHeight: 1.7, paddingLeft: 24 }}>{ticket.materiales}</p>
            )}
            {ticket.acopio && !ticket.materiales && (
              <p style={{ margin: 0, color: darkMode ? "#475569" : "#64748B", fontSize: 12, fontStyle: "italic", paddingLeft: 24 }}>Sin lista de materiales especificada</p>
            )}
          </div>
        )}

        {/* Descripción */}
        {!!ticket.descripcion && (
          <div style={{ background: darkMode ? "#1A2235" : "#F8FAFC", borderRadius: 8, padding: 14, marginBottom: 14 }}>
            <p style={{ margin: 0, color: darkMode ? "#94A3B8" : "#334155", fontSize: 13, lineHeight: 1.7 }}>{ticket.descripcion}</p>
          </div>
        )}

        {/* Imágenes */}
        {ticket.imagenes?.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ margin: "0 0 8px", color: darkMode ? "#64748B" : "#475569", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Imágenes ({ticket.imagenes.length})</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {ticket.imagenes.map((img, i) => (
                <a key={i} href={img.dataUrl} target="_blank" rel="noreferrer">
                  <img src={img.dataUrl} alt={img.nombre} style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 8, border: `1px solid ${darkMode ? "#2E3A55" : "#CBD5E1"}`, cursor: "zoom-in" }} />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Editar fecha/hora/duración — solo encargados y director */}
        {(esEncargadoDest || esDirector) && !["Cancelado"].includes(ticket.estado) && (
          <div style={{ background: darkMode ? "#1A2235" : "#F8FAFC", borderRadius: 8, padding: 14, marginBottom: 14, border: `1px solid ${darkMode ? "#2E3A55" : "#CBD5E1"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: editandoFecha ? 12 : 0 }}>
              <p style={{ margin: 0, color: "#93C5FD", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                📅 Fecha y hora del trabajo
              </p>
              {!editandoFecha
                ? <button onClick={() => setEditandoFecha(true)}
                    style={{ ...btnS, background: darkMode ? "#2E3A55" : "#CBD5E1", color: "#93C5FD", fontSize: 11, padding: "5px 12px" }}>
                    ✏️ Editar
                  </button>
                : <button onClick={() => setEditandoFecha(false)}
                    style={{ ...btnS, background: "transparent", color: darkMode ? "#475569" : "#64748B", fontSize: 11, padding: "5px 12px" }}>
                    Cancelar
                  </button>
              }
            </div>
            {!editandoFecha ? (
              <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
                <span style={{ color: darkMode ? "#64748B" : "#475569", fontSize: 12 }}>
                  📅 {ticket.fechaInicio
                    ? new Date(ticket.fechaInicio).toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })
                    : <span style={{ color: darkMode ? "#334155" : "#94A3B8" }}>Sin fecha</span>}
                  {ticket.horaInicio && <span style={{ color: darkMode ? "#94A3B8" : "#334155" }}> · {ticket.horaInicio}</span>}
                </span>
                {ticket.duracion && <span style={{ color: darkMode ? "#64748B" : "#475569", fontSize: 12 }}>⏱️ {ticket.duracion}</span>}
                {!ticket.fechaInicio && !ticket.duracion && <span style={{ color: darkMode ? "#334155" : "#94A3B8", fontSize: 12 }}>Sin fecha ni duración definidas</span>}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="form-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", color: darkMode ? "#64748B" : "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Fecha inicio</label>
                    <input type="date" style={{ ...inp, colorScheme: "dark", fontSize: 12 }}
                      value={editFecha} onChange={e => setEditFecha(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: "block", color: darkMode ? "#64748B" : "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Hora inicio</label>
                    <input type="time" style={{ ...inp, colorScheme: "dark", fontSize: 12 }}
                      value={editHora} onChange={e => setEditHora(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: "block", color: darkMode ? "#64748B" : "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Duración</label>
                    <select style={{ ...inp, fontSize: 12 }} value={editDuracion} onChange={e => setEditDuracion(e.target.value)}>
                      <option value="">Sin definir</option>
                      <option value="30min">30 minutos</option>
                      <option value="1h">1 hora</option>
                      <option value="2h">2 horas</option>
                      <option value="4h">4 horas</option>
                      <option value="1 día">1 día</option>
                      <option value="2 días">2 días</option>
                      <option value="3 días">3 días</option>
                      <option value="1 semana">1 semana</option>
                      <option value="2 semanas">2 semanas</option>
                      <option value="1 mes">1 mes</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={guardarFecha}
                    style={{ ...btnS, background: "#3182CE", color: "#fff", fontWeight: 800, fontSize: 12 }}>
                    ✓ Guardar cambios
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Editar acopio de materiales — todos los roles */}
        {puedeAccion && !["Cancelado"].includes(ticket.estado) && (
          <div style={{ background: darkMode ? "#1A2235" : "#F8FAFC", borderRadius: 8, padding: 14, marginBottom: 14, border: `1px solid ${darkMode ? "#2E3A55" : "#CBD5E1"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: editandoAcopio ? 12 : 0 }}>
              <p style={{ margin: 0, color: "#93C5FD", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>📦 Acopio de materiales</p>
              {!editandoAcopio
                ? <button onClick={() => setEditandoAcopio(true)} style={{ ...btnS, background: darkMode ? "#2E3A55" : "#CBD5E1", color: "#93C5FD", fontSize: 11, padding: "5px 12px" }}>✏️ Editar</button>
                : <button onClick={() => setEditandoAcopio(false)} style={{ ...btnS, background: "transparent", color: darkMode ? "#475569" : "#64748B", fontSize: 11, padding: "5px 12px" }}>Cancelar</button>
              }
            </div>
            {!editandoAcopio ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                {ticket.acopio === null || ticket.acopio === undefined
                  ? <span style={{ color: darkMode ? "#334155" : "#94A3B8", fontSize: 12 }}>Sin definir</span>
                  : <span style={{ background: ticket.acopio ? "#38A16922" : "#E53E3E22", color: ticket.acopio ? "#38A169" : "#E53E3E", border: `1px solid ${ticket.acopio ? "#38A16955" : "#E53E3E55"}`, borderRadius: 4, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
                      {ticket.acopio ? "✅ Sí" : "❌ No"}
                    </span>
                }
                {ticket.acopio && ticket.materiales && <span style={{ color: darkMode ? "#64748B" : "#475569", fontSize: 12 }}>· {ticket.materiales}</span>}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 10 }}>
                  {[{ val: true, label: "✅ Sí", color: "#38A169" }, { val: false, label: "❌ No", color: "#E53E3E" }].map(({ val, label, color }) => (
                    <button key={String(val)} type="button"
                      onClick={() => { setEditAcopio(val); if (!val) setEditMateriales(""); }}
                      style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 700, padding: "8px 22px", borderRadius: 6, border: `2px solid ${editAcopio === val ? color : darkMode ? "#2E3A55" : "#CBD5E1"}`, cursor: "pointer", background: editAcopio === val ? color + "22" : darkMode ? "#0D1424" : "#FFFFFF", color: editAcopio === val ? color : "#64748B" }}>
                      {label}
                    </button>
                  ))}
                </div>
                {editAcopio === true && (
                  <textarea
                    style={{ ...inp, resize: "vertical", minHeight: 70, fontSize: 12 }}
                    value={editMateriales}
                    onChange={e => setEditMateriales(e.target.value)}
                    placeholder="Lista de materiales necesarios..." />
                )}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={guardarAcopio} style={{ ...btnS, background: "#3182CE", color: "#fff", fontWeight: 800, fontSize: 12 }}>✓ Guardar</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Asignar — solo encargado de empresa destino */}
        {esEncargadoDest && !["Completado", "Cancelado"].includes(ticket.estado) && (
          <div style={{ background: "#1A2C45", borderRadius: 8, padding: 14, marginBottom: 14, border: "1px solid #2E4A70" }}>
            <p style={{ margin: "0 0 10px", color: "#93C5FD", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
              {esDirector ? "Asignar trabajadores (todas las empresas)" : `Asignar trabajadores de ${miEmpresa?.nombre}`}
            </p>
            {misTrabs.length === 0
              ? <p style={{ color: darkMode ? "#475569" : "#64748B", fontSize: 13, margin: "0 0 12px" }}>No hay trabajadores en tu empresa.</p>
              : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                  {esDirector
                    ? EMPRESAS.map(emp => {
                        const trabsEmp = USUARIOS.filter(u => u.empresaId === emp.id && !["director","ceo"].includes(u.rol) && u.activo !== false);
                        if (!trabsEmp.length) return null;
                        return (
                          <div key={emp.id}>
                            <p style={{ margin:"4px 0 6px", color:emp.color, fontSize:10, fontWeight:700, textTransform:"uppercase" }}>{emp.nombre}</p>
                            {trabsEmp.map(u => {
                              const marcado = seleccionados.includes(u.id);
                              const col = emp.color;
                              return (
                                <label key={u.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 12px", borderRadius:8, cursor:"pointer", background: marcado ? col+"18" : "transparent" }}>
                                  <input type="checkbox" checked={marcado} onChange={() => toggleSel(u.id)} style={{ accentColor:col, width:14, height:14 }} />
                                  <Avatar nombre={u.nombre} color={col} size={22} />
                                  <span style={{ color:marcado?"#E2E8F0":"#94A3B8", fontSize:13, fontWeight:marcado?700:400 }}>{u.nombre}</span>
                                  {marcado && <span style={{ color:col, fontSize:12 }}>✓</span>}
                                </label>
                              );
                            })}
                          </div>
                        );
                      })
                    : misTrabs.map(u => {
                        const marcado = seleccionados.includes(u.id);
                        const col = miEmpresa?.color || "#3182CE";
                        return (
                          <label key={u.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:7, background: marcado ? col+"22" : darkMode?"#111827":"#FFFFFF", border:`1px solid ${marcado ? col+"66" : darkMode?"#1E293B":"#E2E8F0"}`, cursor:"pointer" }}>
                            <input type="checkbox" checked={marcado} onChange={() => toggleSel(u.id)} style={{ accentColor:col, width:15, height:15 }} />
                            <Avatar nombre={u.nombre} color={col} size={24} />
                            <span style={{ color:marcado?"#E2E8F0":"#94A3B8", fontSize:13, fontWeight:marcado?700:400, flex:1 }}>{u.nombre}</span>
                            {marcado && <span style={{ color:col, fontSize:12 }}>✓</span>}
                          </label>
                        );
                      })
                  }
                </div>
              )
            }
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: darkMode ? "#64748B" : "#475569", fontSize: 12 }}>{seleccionados.length} seleccionado{seleccionados.length !== 1 ? "s" : ""}</span>
              <button onClick={asignar} disabled={seleccionados.length === 0}
                style={{ ...btnS, background: seleccionados.length > 0 ? "#3182CE" : darkMode ? "#1E293B" : "#E2E8F0", color: seleccionados.length > 0 ? "#fff" : "#475569" }}>
                Confirmar asignación
              </button>
            </div>
          </div>
        )}

        {/* Asignación directa Comercial — solo quien creó el ticket */}
        {empresasDestino.includes(0) && esCreadoPor && !["Completado", "Cancelado"].includes(ticket.estado) && (() => {
          const trabsComercial = USUARIOS.filter(u => u.empresaId === 0 && u.activo !== false);
          const asignadosComercial = asignaciones[0] || [];
          const col = "#E53E3E";
          const asignarComercial = (nuevos) => {
            const nuevasAsig = { ...asignaciones, 0: nuevos };
            onActualizar({
              ...ticket,
              asignacionesPorEmpresa: nuevasAsig,
              estado: nuevos.length > 0 && ticket.estado === "Pendiente" ? "Asignado" : ticket.estado,
              fechaAsignacion: ticket.fechaAsignacion || new Date().toISOString(),
            });
          };
          return (
            <div style={{ background: "#2A1A1A", borderRadius: 8, padding: 14, marginBottom: 14, border: `1px solid ${col}33` }}>
              <p style={{ margin: "0 0 10px", color: col, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                🎯 Asignación directa — Comercial
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                {trabsComercial.map(u => {
                  const marcado = asignadosComercial.includes(u.id);
                  return (
                    <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 7, background: marcado ? col + "22" : darkMode ? "#111827" : "#FFFFFF", border: `1px solid ${marcado ? col + "66" : darkMode ? "#1E293B" : "#E2E8F0"}`, cursor: "pointer" }}>
                      <input type="checkbox" checked={marcado}
                        onChange={() => {
                          const nuevos = marcado
                            ? asignadosComercial.filter(id => id !== u.id)
                            : [...asignadosComercial, u.id];
                          asignarComercial(nuevos);
                        }}
                        style={{ accentColor: col, width: 15, height: 15 }} />
                      <Avatar nombre={u.nombre} color={col} size={24} />
                      <span style={{ color: marcado ? "#E2E8F0" : "#94A3B8", fontSize: 13, fontWeight: marcado ? 700 : 400, flex: 1 }}>{u.nombre}</span>
                      {marcado && <span style={{ color: col, fontSize: 12 }}>✓</span>}
                    </label>
                  );
                })}
              </div>
              <p style={{ margin: 0, color: darkMode ? "#64748B" : "#475569", fontSize: 11 }}>
                {asignadosComercial.length} persona{asignadosComercial.length !== 1 ? "s" : ""} asignada{asignadosComercial.length !== 1 ? "s" : ""} — la asignación se guarda automáticamente
              </p>
            </div>
          );
        })()}

        {/* Cambiar estado — flujo ordenado con permisos */}
        {!["Completado", "Cancelado"].includes(ticket.estado) && (() => {
          const puedeCancelar  = esEncargadoDest || esCreadoPor || esDirector;
          const puedeAvanzar   = esEncargadoDest || esAsignado  || esDirector;
          const estadoActual   = ticket.estado;
          const puedeProgreso  = puedeAvanzar && estadoActual === "Asignado";
          // Trabajador y encargado pueden completar desde Asignado o En progreso
          const puedeCompletar = puedeAvanzar && (estadoActual === "En progreso" || estadoActual === "Asignado");

          // Comprobar si la empresa del usuario ya marcó completado
          const miEmpresaId         = usuarioActual.empresaId;
          const yaCompleteMiEmpresa = (ticket.completadoPorEmpresa || {})[miEmpresaId] === true;
          const hayVariasEmpresas   = (ticket.empresasDestino || []).length > 1;
          const labelCompletar      = hayVariasEmpresas
            ? (yaCompleteMiEmpresa ? "✓ Tu empresa ya completó" : "✓ Completar mi parte")
            : "✓ Completado";

          if (!puedeAvanzar && !puedeCancelar) return null;
          return (
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              {puedeProgreso && (
                <button onClick={() => cambiarEstado("En progreso")} style={{ ...btnS, background: "#D4A01722", color: "#D4A017", border: "1px solid #D4A01755" }}>▶ En progreso</button>
              )}
              {puedeCompletar && !yaCompleteMiEmpresa && (
                <button onClick={() => cambiarEstado("Completado")} style={{ ...btnS, background: "#38A16922", color: "#38A169", border: "1px solid #38A16955" }}>{labelCompletar}</button>
              )}
              {puedeCompletar && yaCompleteMiEmpresa && (
                <span style={{ ...btnS, background: "#38A16911", color: "#38A16988", border: "1px solid #38A16933", cursor: "default" }}>{labelCompletar}</span>
              )}
              {puedeCancelar && (
                <button onClick={() => cambiarEstado("Cancelado")} style={{ ...btnS, background: "#E53E3E22", color: "#E53E3E", border: "1px solid #E53E3E55" }}>✕ Cancelar</button>
              )}
            </div>
          );
        })()}

        {/* Comentarios */}
        <div>
          <p style={{ margin: "0 0 10px", color: darkMode ? "#64748B" : "#475569", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
            Comentarios ({ticket.comentarios.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12, maxHeight: 200, overflowY: "auto" }}>
            {ticket.comentarios.length === 0
              ? <p style={{ color: darkMode ? "#475569" : "#64748B", fontSize: 13, margin: 0 }}>Sin comentarios aún.</p>
              : ticket.comentarios.map(c => {
                  const autor = USUARIOS.find(u => u.id === c.autorId);
                  const col   = EMPRESAS.find(e => e.id === autor?.empresaId)?.color || "#666";
                  return (
                    <div key={c.id} style={{ background: darkMode ? "#1A2235" : "#F8FAFC", borderRadius: 8, padding: 10, display: "flex", gap: 10 }}>
                      {autor && <Avatar nombre={autor.nombre} color={col} size={26} />}
                      <div>
                        <div style={{ display: "flex", gap: 8, marginBottom: 3 }}>
                          <span style={{ color: "#CBD5E1", fontSize: 12, fontWeight: 700 }}>{autor?.nombre}</span>
                          <span style={{ color: darkMode ? "#475569" : "#64748B", fontSize: 11 }}>{fmtFecha(c.fecha)}</span>
                        </div>
                        {c.texto && <p style={{ margin: 0, color: darkMode ? "#94A3B8" : "#334155", fontSize: 13, lineHeight: 1.5 }}>{c.texto}</p>}
                        {c.adjuntos?.length > 0 && (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                            {c.adjuntos.map((a, ai) => a.tipo?.startsWith("image/")
                              ? <a key={ai} href={a.dataUrl} target="_blank" rel="noreferrer"><img src={a.dataUrl} alt={a.nombre} style={{ width: 70, height: 70, objectFit: "cover", borderRadius: 6, border: `1px solid ${darkMode ? "#2E3A55" : "#CBD5E1"}`, cursor: "zoom-in" }} /></a>
                              : <a key={ai} href={a.dataUrl} download={a.nombre} style={{ display: "flex", alignItems: "center", gap: 5, background: darkMode ? "#0D1424" : "#FFFFFF", border: `1px solid ${darkMode ? "#2E3A55" : "#CBD5E1"}`, borderRadius: 6, padding: "5px 10px", color: "#93C5FD", fontSize: 11, textDecoration: "none" }}>📄 {a.nombre}</a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
            }
          </div>
          {adjuntos.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {adjuntos.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, background: darkMode ? "#1A2235" : "#F8FAFC", border: `1px solid ${darkMode ? "#2E3A55" : "#CBD5E1"}`, borderRadius: 6, padding: "4px 8px" }}>
                  <span style={{ fontSize: 12 }}>{a.tipo?.startsWith("image/") ? "🖼️" : "📄"}</span>
                  <span style={{ color: darkMode ? "#94A3B8" : "#334155", fontSize: 11 }}>{a.nombre}</span>
                  <button onClick={() => setAdjuntos(p => p.filter((_,idx) => idx !== i))} style={{ background: "none", border: "none", color: darkMode ? "#475569" : "#64748B", cursor: "pointer", fontSize: 13, lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <input style={{ ...inp, flex: 1 }} value={comentario} onChange={e => setComentario(e.target.value)}
              placeholder="Escribe un comentario..." onKeyDown={e => e.key === "Enter" && enviarComentario()} />
            <label style={{ ...btnS, background: darkMode ? "#1A2235" : "#F8FAFC", color: darkMode ? "#64748B" : "#475569", border: `1px solid ${darkMode ? "#2E3A55" : "#CBD5E1"}`, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center" }} title="Adjuntar archivo">
              📎
              <input type="file" accept="image/*,.pdf" multiple onChange={handleAdjuntos} style={{ display: "none" }} />
            </label>
            <button onClick={enviarComentario} style={{ ...btnS, background: accentColor, color: "#fff", fontWeight: 800, flexShrink: 0 }}>Enviar</button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── TARJETA TICKET ───────────────────────────────────────────────────────────
function TarjetaTicket({ ticket, onClick }) {
  const darkMode = __darkMode;
  const empresasDestino   = ticket.empresasDestino || [];
  const asignaciones      = ticket.asignacionesPorEmpresa || {};
  const todosAsignadosIds = Object.values(asignaciones).flat();
  const asignadosArr      = USUARIOS.filter(u => todosAsignadosIds.includes(u.id));
  const empOrigen         = EMPRESAS.find(e => e.id === ticket.empresaOrigenId);

  // ── Lógica de fecha límite ──
  const completado    = ["Completado", "Cancelado"].includes(ticket.estado);
  const hoy           = new Date(); hoy.setHours(0, 0, 0, 0);
  const limiteDate    = ticket.fechaLimite ? new Date(ticket.fechaLimite + "T00:00:00") : null;
  const vencido       = !completado && limiteDate && limiteDate < hoy;
  const venceHoy      = !completado && limiteDate && limiteDate.getTime() === hoy.getTime();
  const venceProximo  = !completado && limiteDate && limiteDate > hoy && (limiteDate - hoy) <= 2 * 24 * 60 * 60 * 1000;
  const alertaLimite  = vencido || venceHoy;

  return (
    <div onClick={onClick}
      style={{
        background:   darkMode ? "#111827" : "#FFFFFF",
        border:       alertaLimite ? "1px solid #E53E3E" : `1px solid ${darkMode ? "#1E293B" : "#E2E8F0"}`,
        borderRadius: 10,
        padding:      "16px 18px",
        cursor:       "pointer",
        transition:   alertaLimite ? "none" : "border-color .15s, transform .15s",
        animation:    alertaLimite ? "parpadeo 1.6s ease-in-out infinite" : "none",
      }}
      onMouseEnter={e => { if (!alertaLimite) { e.currentTarget.style.borderColor = (empOrigen?.color || "#3182CE") + "66"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
      onMouseLeave={e => { if (!alertaLimite) { e.currentTarget.style.borderColor = darkMode ? "#1E293B" : "#E2E8F0"; e.currentTarget.style.transform = "none"; } }}>

      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
          <EmpresaTag empresaId={ticket.empresaOrigenId} />
          <span style={{ color: darkMode ? "#475569" : "#64748B", fontSize: 12 }}>→</span>
          {empresasDestino.map(id => <EmpresaTag key={id} empresaId={id} />)}
        </div>
        {vencido    && <span style={{ background: "#E53E3E", color: "#fff", borderRadius: 5, padding: "2px 8px", fontSize: 10, fontWeight: 800, letterSpacing: .4 }}>⚠️ VENCIDO</span>}
        {venceHoy   && !vencido && <span style={{ background: "#E53E3E22", color: "#E53E3E", border: "1px solid #E53E3E88", borderRadius: 5, padding: "2px 8px", fontSize: 10, fontWeight: 800 }}>🔴 VENCE HOY</span>}
        {venceProximo && !venceHoy && <span style={{ background: "#D4A01722", color: "#D4A017", border: "1px solid #D4A01788", borderRadius: 5, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>⏰ Vence pronto</span>}
      </div>

      <p style={{ margin: "0 0 10px", color: darkMode ? "#E2E8F0" : "#0F172A", fontSize: 14, fontWeight: 700, lineHeight: 1.4 }}>{ticket.titulo}</p>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        <Badge texto={ticket.estado}    color={ESTADO_COLORES[ticket.estado]}        small />
        <Badge texto={ticket.prioridad} color={PRIORIDAD_COLORES[ticket.prioridad]}  small />
        <Badge texto={ticket.categoria} color="#475569"                               small />
      </div>

      {(ticket.fechaInicio || ticket.ubicacion) && (
        <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
          {ticket.fechaInicio && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: darkMode ? "#64748B" : "#475569", fontSize: 11 }}>
              <span>📅</span>
              {new Date(ticket.fechaInicio).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
              {ticket.horaInicio && ` · ${ticket.horaInicio}`}
              {ticket.duracion && <span style={{ color: darkMode ? "#475569" : "#64748B" }}> ({ticket.duracion})</span>}
            </span>
          )}
          {ticket.ubicacion && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: darkMode ? "#64748B" : "#475569", fontSize: 11 }}>
              <span>📍</span>
              <span style={{ maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ticket.ubicacion}</span>
            </span>
          )}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex" }}>
          {asignadosArr.slice(0, 3).map((u, i) => {
            const col = EMPRESAS.find(e => e.id === u.empresaId)?.color || "#666";
            return (
              <div key={u.id} style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 3 - i, border: "2px solid #111827", borderRadius: "50%" }}>
                <Avatar nombre={u.nombre} color={col} size={26} />
              </div>
            );
          })}
          {asignadosArr.length > 3 && (
            <div style={{ marginLeft: -8, width: 26, height: 26, borderRadius: "50%", background: darkMode ? "#1E293B" : "#E2E8F0", border: "2px solid #111827", display: "flex", alignItems: "center", justifyContent: "center", color: darkMode ? "#64748B" : "#475569", fontSize: 10, fontWeight: 700 }}>
              +{asignadosArr.length - 3}
            </div>
          )}
          {asignadosArr.length === 0 && <span style={{ color: darkMode ? "#334155" : "#94A3B8", fontSize: 11 }}>Sin asignar</span>}
        </div>
        <span style={{ color: darkMode ? "#334155" : "#94A3B8", fontSize: 11 }}>{fmtFecha(ticket.fecha)}</span>
      </div>

      {/* Barra de progreso con checks */}
      {(() => {
        const estado = ticket.estado;
        const completado  = estado === "Completado";
        const enProgreso  = estado === "En progreso";
        const asignado    = estado === "Asignado" || enProgreso || completado;
        const colAsignado   = "#3182CE";
        const colProgreso   = "#DD6B20";
        const colCompletado = "#38A169";
        const colActivo     = completado ? colCompletado : enProgreso ? colProgreso : asignado ? colAsignado : "#475569";

        const Check = ({ activo, color }) => (
          <div style={{
            width: 20, height: 20, borderRadius: "50%",
            background: activo ? color + "22" : darkMode ? "#1A2235" : "#F8FAFC",
            border: `2px solid ${activo ? color : darkMode ? "#2E3A55" : "#CBD5E1"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all .3s"
          }}>
            {activo && <span style={{ color, fontSize: 11, fontWeight: 900, lineHeight: 1 }}>✓</span>}
          </div>
        );

        const Line = ({ activo, color }) => (
          <div style={{ flex: 1, height: 2, borderRadius: 1, background: activo ? color : darkMode ? "#2E3A55" : "#CBD5E1", transition: "all .3s" }} />
        );

        return (
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #1E293B22" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {/* Check 1: Creado — siempre activo */}
              <Check activo={true} color={colActivo} />
              <Line activo={asignado} color={enProgreso || completado ? (completado ? colCompletado : colProgreso) : colAsignado} />
              {/* Check 2: Asignado */}
              <Check activo={asignado} color={enProgreso || completado ? (completado ? colCompletado : colProgreso) : colAsignado} />
              <Line activo={enProgreso || completado} color={completado ? colCompletado : colProgreso} />
              {/* Check 3: En progreso */}
              <Check activo={enProgreso || completado} color={completado ? colCompletado : colProgreso} />
              <Line activo={completado} color={colCompletado} />
              {/* Check 4: Completado */}
              <Check activo={completado} color={colCompletado} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ color: darkMode ? "#334155" : "#94A3B8", fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>Creado</span>
              <span style={{ color: asignado ? (enProgreso || completado ? (completado ? colCompletado : colProgreso) : colAsignado) : darkMode ? "#2E3A55" : "#CBD5E1", fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>Asignado</span>
              <span style={{ color: enProgreso || completado ? (completado ? colCompletado : colProgreso) : darkMode ? "#2E3A55" : "#CBD5E1", fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>En progreso</span>
              <span style={{ color: completado ? colCompletado : darkMode ? "#2E3A55" : "#CBD5E1", fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>Completado</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── CALENDARIO ───────────────────────────────────────────────────────────────
function Calendario({ tickets, ticketsPersonales, usuarioActual, onVerTicket, onVerTicketPersonal }) {
  const darkMode = __darkMode;
  const hoy  = new Date();
  const [mes,  setMes]  = useState(hoy.getMonth());
  const [anio, setAnio] = useState(hoy.getFullYear());

  const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const DIAS  = ["L","M","X","J","V","S","D"];

  // Tickets que aparecen en el calendario:
  // - Deben tener fechaInicio definida
  // - El usuario debe estar asignado (o ser encargado/director)
  const misTickets = tickets.filter(t => {
    if (!t.fechaInicio) return false; // solo tickets con fecha de inicio
    const todosAsignados = Object.values(t.asignacionesPorEmpresa || {}).flat();
    const eds = t.empresasDestino || [];
    return todosAsignados.includes(usuarioActual.id) ||
           (usuarioActual.rol === "encargado" && eds.includes(usuarioActual.empresaId)) ||
           (["director","ceo"].includes(usuarioActual.rol)) ||
           t.creadoPor === usuarioActual.id;
  });

  const ticketsPorDia = useMemo(() => {
    const mapa = {};
    misTickets.forEach(t => {
      const d = new Date(t.fechaInicio); // usar fechaInicio
      const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!mapa[k]) mapa[k] = [];
      mapa[k].push({ ...t, _personal: false });
    });
    (ticketsPersonales || []).forEach(t => {
      if (!t.fecha) return;
      const d = new Date(t.fecha);
      const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!mapa[k]) mapa[k] = [];
      mapa[k].push({ ...t, _personal: true });
    });
    return mapa;
  }, [misTickets, ticketsPersonales]);

  const primerDia = new Date(anio, mes, 1);
  const ultimoDia = new Date(anio, mes + 1, 0);
  let inicio = primerDia.getDay() - 1;
  if (inicio < 0) inicio = 6;

  const celdas = [];
  for (let i = 0; i < inicio; i++) celdas.push(null);
  for (let d = 1; d <= ultimoDia.getDate(); d++) celdas.push(d);
  while (celdas.length % 7 !== 0) celdas.push(null);

  const irMes = (dir) => {
    if (dir === -1) { if (mes === 0) { setMes(11); setAnio(a => a-1); } else setMes(m => m-1); }
    else            { if (mes === 11) { setMes(0); setAnio(a => a+1); } else setMes(m => m+1); }
  };

  const esteMes = misTickets.filter(t => {
    const d = new Date(t.fechaInicio);
    return d.getMonth() === mes && d.getFullYear() === anio;
  }).length;

  return (
    <div style={{ background: darkMode ? "#111827" : "#FFFFFF", border: `1px solid ${darkMode ? "#1E293B" : "#E2E8F0"}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${darkMode ? "#1E293B" : "#E2E8F0"}` }}>
        <button onClick={() => irMes(-1)} style={{ background: darkMode ? "#1A2235" : "#F8FAFC", border: "none", color: darkMode ? "#94A3B8" : "#334155", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 18 }}>‹</button>
        <h3 style={{ margin: 0, color: darkMode ? "#E2E8F0" : "#0F172A", fontWeight: 800, fontSize: 15 }}>{MESES[mes]} {anio}</h3>
        <button onClick={() => irMes(1)}  style={{ background: darkMode ? "#1A2235" : "#F8FAFC", border: "none", color: darkMode ? "#94A3B8" : "#334155", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 18 }}>›</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", background: darkMode ? "#0D1424" : "#FFFFFF" }}>
        {DIAS.map(d => <div key={d} style={{ textAlign: "center", padding: "8px 0", color: darkMode ? "#475569" : "#64748B", fontSize: 11, fontWeight: 700 }}>{d}</div>)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1, background: darkMode ? "#1E293B" : "#E2E8F0" }}>
        {celdas.map((dia, i) => {
          if (!dia) return <div key={i} style={{ background: darkMode ? "#0D1424" : "#FFFFFF", minHeight: 80 }} />;
          const k = `${anio}-${mes}-${dia}`;
          const tHoy = ticketsPorDia[k] || [];
          const esHoy = dia === hoy.getDate() && mes === hoy.getMonth() && anio === hoy.getFullYear();
          return (
            <div key={i} style={{ background: darkMode ? "#111827" : "#FFFFFF", minHeight: 80, padding: "6px 4px" }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: "50%", background: esHoy ? "#E53E3E" : "transparent", color: esHoy ? "#fff" : "#64748B", fontSize: 12, fontWeight: esHoy ? 800 : 400, marginBottom: 4 }}>{dia}</span>
              {tHoy.slice(0, 3).map(t => {
                if (t._personal) {
                  const hecho = t.estado === "hecho";
                  return (
                    <div key={t.id} onClick={() => onVerTicketPersonal && onVerTicketPersonal(t)}
                      style={{ background: hecho ? "#FFFFFF18" : "#FFFFFF11", border: `1px solid ${hecho ? "#FFFFFF55" : "#FFFFFF33"}`, borderRadius: 3, padding: "2px 5px", cursor: "pointer", marginBottom: 2 }}
                      title={t.titulo}>
                      <p style={{ margin: 0, color: darkMode ? "#E2E8F0" : "#0F172A", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {hecho ? "✓ " : "📝 "}{t.titulo}
                      </p>
                    </div>
                  );
                }
                const emp = EMPRESAS.find(e => e.id === t.empresaOrigenId);
                const completado = t.estado === "Completado";
                const color = completado ? "#38A169" : (emp?.color || "#3182CE");
                return (
                  <div key={t.id} onClick={() => onVerTicket(t)}
                    style={{ background: color + (completado ? "33" : "22"), border: `1px solid ${color}${completado ? "88" : "44"}`, borderRadius: 3, padding: "2px 5px", cursor: "pointer", marginBottom: 2 }}
                    title={t.titulo}>
                    <p style={{ margin: 0, color, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {completado ? "✓ " : ""}{t.titulo}
                    </p>
                  </div>
                );
              })}
              {tHoy.length > 3 && <p style={{ margin: 0, color: darkMode ? "#475569" : "#64748B", fontSize: 10 }}>+{tHoy.length - 3} más</p>}
            </div>
          );
        })}
      </div>

      <div style={{ padding: "12px 16px", borderTop: `1px solid ${darkMode ? "#1E293B" : "#E2E8F0"}` }}>
        <span style={{ color: darkMode ? "#475569" : "#64748B", fontSize: 11 }}>Este mes: <strong style={{ color: darkMode ? "#94A3B8" : "#334155" }}>{esteMes}</strong> ticket{esteMes !== 1 ? "s" : ""} con fecha de inicio</span>
      </div>
    </div>
  );
}


// ─── REPORTES ─────────────────────────────────────────────────────────────────
function Reportes({ tickets, usuarioActual, darkMode, EMPRESAS: EMP, USUARIOS: USR }) {
  const _EMPRESAS = EMP || EMPRESAS;
  const _USUARIOS = USR || USUARIOS;
  const [empresaFiltro, setEmpresaFiltro] = useState("todas");
  const [mesFiltro, setMesFiltro]         = useState("todos");

  const completados = tickets.filter(t => t.estado === "Completado");

  // Meses disponibles
  const mesesDisponibles = [...new Set(completados.map(t => {
    const d = new Date(t.fecha);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }))].sort().reverse();

  const ticketsFiltrados = completados.filter(t => {
    const eds = t.empresasDestino || [];
    if (empresaFiltro !== "todas" && t.empresaOrigenId !== Number(empresaFiltro) && !eds.includes(Number(empresaFiltro))) return false;
    if (mesFiltro !== "todos") {
      const d = new Date(t.fecha);
      const m = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      if (m !== mesFiltro) return false;
    }
    return true;
  });

  const generarPDF = () => {
    if (ticketsFiltrados.length === 0) return;

    // Usamos la API de impresión del navegador con una ventana nueva
    const empFiltroNombre = empresaFiltro === "todas"
      ? "Todas las empresas"
      : EMPRESAS.find(e => e.id === Number(empresaFiltro))?.nombre || "";

    const mesFiltroNombre = mesFiltro === "todos"
      ? "Todos los meses"
      : new Date(mesFiltro + "-01").toLocaleDateString("es-ES", { month: "long", year: "numeric" });

    const ahora = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });

    const filas = ticketsFiltrados.map(t => {
      const origen  = EMPRESAS.find(e => e.id === t.empresaOrigenId)?.nombre || "-";
      const destinos = (t.empresasDestino || []).map(id => EMPRESAS.find(e => e.id === id)?.nombre).filter(Boolean).join(", ") || "-";
      const creador  = USUARIOS.find(u => u.id === t.creadoPor)?.nombre || "-";
      const asignados = Object.values(t.asignacionesPorEmpresa || {}).flat()
        .map(id => USUARIOS.find(u => u.id === id)?.nombre).filter(Boolean).join(", ") || "Sin asignar";
      const fecha = t.fechaInicio
        ? new Date(t.fechaInicio).toLocaleDateString("es-ES") + (t.horaInicio ? " " + t.horaInicio : "")
        : new Date(t.fecha).toLocaleDateString("es-ES");
      const comentariosTexto = (t.comentarios || []).map(c => {
        const autor = USUARIOS.find(u => u.id === c.autorId)?.nombre || "?";
        return `${autor}: ${c.texto}`;
      }).join(" | ") || "-";

      const acopioTexto = t.acopio === true
        ? `<span style="background:#c6f6d5;color:#276749;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">✓ Sí</span>${t.materiales ? `<br><span style="font-size:10px;color:#4a5568;font-style:italic">${t.materiales}</span>` : ""}`
        : t.acopio === false
          ? `<span style="background:#fed7d7;color:#c53030;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">✗ No</span>`
          : `<span style="color:#a0aec0;font-size:11px">-</span>`;

      return `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#1a202c">${t.titulo}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;color:#4a5568">${origen}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;color:#4a5568">${destinos}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;color:#4a5568">${fecha}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;color:#4a5568">${t.duracion || "-"}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;color:#4a5568">${t.ubicacion || "-"}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;color:#4a5568">${t.categoria}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0"><span style="background:${t.prioridad==="Urgente"?"#fed7d7":t.prioridad==="Alta"?"#feebc8":t.prioridad==="Media"?"#fefcbf":"#c6f6d5"};color:${t.prioridad==="Urgente"?"#c53030":t.prioridad==="Alta"?"#c05621":t.prioridad==="Media"?"#b7791f":"#276749"};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">${t.prioridad}</span></td>
          <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;color:#4a5568;font-size:11px">${acopioTexto}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;color:#4a5568;font-size:11px">${asignados}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;color:#718096;font-size:11px;max-width:200px">${comentariosTexto}</td>
        </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte de Tickets — Grupo</title>
  <style>
    @page { size: A4 landscape; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a202c; font-size: 12px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid #2d3748; }
    .logo { font-size: 22px; font-weight: 900; color: #2d3748; }
    .logo span { color: #e53e3e; }
    .meta { text-align: right; color: #718096; font-size: 11px; }
    .meta strong { display: block; font-size: 14px; color: #2d3748; margin-bottom: 4px; }
    .filtros { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 16px; margin-bottom: 20px; display: flex; gap: 24px; }
    .filtro-item { font-size: 11px; color: #718096; }
    .filtro-item strong { color: #2d3748; display: block; font-size: 12px; }
    .resumen { display: flex; gap: 12px; margin-bottom: 20px; }
    .stat { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 16px; flex: 1; text-align: center; }
    .stat .num { font-size: 28px; font-weight: 900; color: #2d3748; }
    .stat .lbl { font-size: 10px; color: #718096; text-transform: uppercase; letter-spacing: .5px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #2d3748; }
    thead th { padding: 10px 8px; color: #fff; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; text-align: left; white-space: nowrap; }
    tbody tr:nth-child(even) { background: #f7fafc; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; color: #a0aec0; font-size: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">🏢 Grupo<span>Tickets</span></div>
      <div style="color:#718096;font-size:12px;margin-top:4px">Reporte de trabajos completados</div>
    </div>
    <div class="meta">
      <strong>Reporte generado el ${ahora}</strong>
      <span>Por: ${USUARIOS.find(u=>u.id===usuarioActual.id)?.nombre || "Sistema"}</span>
    </div>
  </div>

  <div class="filtros">
    <div class="filtro-item"><strong>Empresa</strong>${empFiltroNombre}</div>
    <div class="filtro-item"><strong>Período</strong>${mesFiltroNombre}</div>
    <div class="filtro-item"><strong>Total tickets</strong>${ticketsFiltrados.length} completados</div>
  </div>

  <div class="resumen">
    <div class="stat"><div class="num">${ticketsFiltrados.length}</div><div class="lbl">Tickets completados</div></div>
    <div class="stat"><div class="num">${[...new Set(ticketsFiltrados.map(t=>t.empresaOrigenId))].length}</div><div class="lbl">Empresas origen</div></div>
    <div class="stat"><div class="num">${[...new Set(ticketsFiltrados.flatMap(t=>t.empresasDestino||[]))].length}</div><div class="lbl">Empresas destino</div></div>
    <div class="stat"><div class="num">${[...new Set(Object.values(ticketsFiltrados.reduce((a,t)=>({...a,...(t.asignacionesPorEmpresa||{})}),{})).flat())].length}</div><div class="lbl">Trabajadores involucrados</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Título</th>
        <th>Origen</th>
        <th>Destino(s)</th>
        <th>Fecha/Hora</th>
        <th>Duración</th>
        <th>Ubicación</th>
        <th>Categoría</th>
        <th>Prioridad</th>
        <th>Acopio</th>
        <th>Trabajadores</th>
        <th>Comentarios</th>
      </tr>
    </thead>
    <tbody>${filas}</tbody>
  </table>

  <div class="footer">
    <span>Grupo Tickets — Documento confidencial</span>
    <span>Total: ${ticketsFiltrados.length} trabajos completados</span>
  </div>

  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

    const ventana = window.open("", "_blank");
    ventana.document.write(html);
    ventana.document.close();
  };

  const empColor = EMPRESAS.find(e => e.id === usuarioActual.empresaId)?.color || "#94A3B8";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", color: darkMode ? "#E2E8F0" : "#0F172A", fontWeight: 800, fontSize: 18 }}>📄 Reportes de facturación</h2>
          <p style={{ margin: 0, color: darkMode ? "#475569" : "#64748B", fontSize: 13 }}>Genera PDFs con los tickets completados para facturación</p>
        </div>
        <button onClick={generarPDF} disabled={ticketsFiltrados.length === 0}
          style={{ ...btnS, background: ticketsFiltrados.length > 0 ? "#38A169" : darkMode ? "#1E293B" : "#E2E8F0", color: ticketsFiltrados.length > 0 ? "#fff" : "#475569", fontSize: 13, padding: "10px 20px", fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
          ⬇ Descargar PDF {ticketsFiltrados.length > 0 ? `(${ticketsFiltrados.length})` : ""}
        </button>
      </div>

      {/* FILTROS */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={labelS}>Filtrar por empresa</label>
          <select style={{ ...inp, background: darkMode ? "#111827" : "#FFFFFF" }} value={empresaFiltro} onChange={e => setEmpresaFiltro(e.target.value)}>
            <option value="todas">Todas las empresas</option>
            {EMPRESAS.filter(e => e.id !== 0).map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={labelS}>Filtrar por mes</label>
          <select style={{ ...inp, background: darkMode ? "#111827" : "#FFFFFF" }} value={mesFiltro} onChange={e => setMesFiltro(e.target.value)}>
            <option value="todos">Todos los meses</option>
            {mesesDisponibles.map(m => {
              const [anio, mes] = m.split("-");
              const nombre = new Date(Number(anio), Number(mes)-1, 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
              return <option key={m} value={m}>{nombre.charAt(0).toUpperCase() + nombre.slice(1)}</option>;
            })}
          </select>
        </div>
      </div>

      {/* RESUMEN STATS */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(4,1fr)`, gap: 12, marginBottom: 24 }}>
        {[
          ["Completados", ticketsFiltrados.length, "#38A169", "✅"],
          ["Empresas origen", [...new Set(ticketsFiltrados.map(t=>t.empresaOrigenId))].length, "#3182CE", "🏢"],
          ["Empresas destino", [...new Set(ticketsFiltrados.flatMap(t=>t.empresasDestino||[]))].length, "#805AD5", "📦"],
          ["Trabajadores", [...new Set(ticketsFiltrados.flatMap(t=>Object.values(t.asignacionesPorEmpresa||{}).flat()))].length, "#D4A017", "👷"],
        ].map(([l,v,c,ic]) => (
          <div key={l} style={{ background: darkMode ? "#111827" : "#FFFFFF", border: `1px solid ${darkMode ? "#1E293B" : "#E2E8F0"}`, borderRadius: 10, padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: c+"22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>{ic}</div>
            <div>
              <p style={{ margin: 0, color: darkMode ? "#475569" : "#64748B", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{l}</p>
              <p style={{ margin: "2px 0 0", color: c, fontSize: 24, fontWeight: 900, lineHeight: 1 }}>{v}</p>
            </div>
          </div>
        ))}
      </div>

      {/* TABLA PREVIA */}
      {ticketsFiltrados.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: darkMode ? "#111827" : "#FFFFFF", borderRadius: 12, border: `1px solid ${darkMode ? "#1E293B" : "#E2E8F0"}` }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>📭</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: darkMode ? "#475569" : "#64748B" }}>No hay tickets completados con este filtro</p>
          <p style={{ fontSize: 13, color: darkMode ? "#334155" : "#94A3B8" }}>Completa algún ticket o cambia los filtros</p>
        </div>
      ) : (
        <div style={{ background: darkMode ? "#111827" : "#FFFFFF", borderRadius: 12, border: `1px solid ${darkMode ? "#1E293B" : "#E2E8F0"}`, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${darkMode ? "#1E293B" : "#E2E8F0"}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: darkMode ? "#94A3B8" : "#334155", fontSize: 13, fontWeight: 700 }}>Vista previa del reporte</span>
            <span style={{ color: darkMode ? "#475569" : "#64748B", fontSize: 12 }}>{ticketsFiltrados.length} ticket{ticketsFiltrados.length !== 1 ? "s" : ""}</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: darkMode ? "#0D1424" : "#FFFFFF" }}>
                  {["Título","Origen","Destino(s)","Fecha","Duración","Ubicación","Categoría","Prioridad","Trabajadores"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", color: darkMode ? "#64748B" : "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ticketsFiltrados.map((t, idx) => {
                  const origen   = EMPRESAS.find(e => e.id === t.empresaOrigenId);
                  const destinos = (t.empresasDestino||[]).map(id => EMPRESAS.find(e=>e.id===id)).filter(Boolean);
                  const asignados = Object.values(t.asignacionesPorEmpresa||{}).flat()
                    .map(id => USUARIOS.find(u=>u.id===id)?.nombre).filter(Boolean);
                  const fecha = t.fechaInicio
                    ? new Date(t.fechaInicio).toLocaleDateString("es-ES") + (t.horaInicio ? " "+t.horaInicio : "")
                    : new Date(t.fecha).toLocaleDateString("es-ES");
                  return (
                    <tr key={t.id} style={{ borderBottom: `1px solid ${darkMode ? "#1E293B" : "#E2E8F0"}`, background: idx % 2 === 0 ? "transparent" : "#0D142488" }}>
                      <td style={{ padding: "10px 12px", color: darkMode ? "#E2E8F0" : "#0F172A", fontSize: 12, fontWeight: 600, maxWidth: 160 }}>{t.titulo}</td>
                      <td style={{ padding: "10px 12px" }}><EmpresaTag empresaId={t.empresaOrigenId} /></td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {destinos.map(e => <EmpresaTag key={e.id} empresaId={e.id} />)}
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px", color: darkMode ? "#94A3B8" : "#334155", fontSize: 12, whiteSpace: "nowrap" }}>{fecha}</td>
                      <td style={{ padding: "10px 12px", color: darkMode ? "#94A3B8" : "#334155", fontSize: 12 }}>{t.duracion || <span style={{color:"#334155"}}>—</span>}</td>
                      <td style={{ padding: "10px 12px", color: darkMode ? "#94A3B8" : "#334155", fontSize: 12, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.ubicacion || <span style={{color:"#334155"}}>—</span>}</td>
                      <td style={{ padding: "10px 12px" }}><Badge texto={t.categoria} color="#475569" small /></td>
                      <td style={{ padding: "10px 12px" }}><Badge texto={t.prioridad} color={PRIORIDAD_COLORES[t.prioridad]} small /></td>
                      <td style={{ padding: "10px 12px", color: darkMode ? "#94A3B8" : "#334155", fontSize: 11, maxWidth: 160 }}>
                        {asignados.length > 0 ? asignados.join(", ") : <span style={{color:"#334155"}}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────────
// ─── MODAL MIS TICKETS ────────────────────────────────────────────────────────
function ModalMisTickets({ usuarioId, tickets, onClose, onCrear, onVerDetalle }) {
  const darkMode = __darkMode;
  const [creando, setCreando] = useState(false);
  const [titulo, setTitulo]   = useState("");
  const [desc, setDesc]       = useState("");
  const [fecha, setFecha]     = useState("");
  const [hora, setHora]       = useState("");
  const [alerta, setAlerta]   = useState(false);
  const [enviando, setEnviando] = useState(false);

  const inp2 = { fontFamily: "inherit", fontSize: 13, background: darkMode ? "#1A2235" : "#F8FAFC", border: `1px solid ${darkMode ? "#2E3A55" : "#CBD5E1"}`, borderRadius: 6, padding: "9px 12px", color: darkMode ? "#E2E8F0" : "#0F172A", outline: "none", width: "100%", boxSizing: "border-box" };

  const pendientes = tickets.filter(t => t.estado !== "hecho");
  const hechos     = tickets.filter(t => t.estado === "hecho");

  const submit = () => {
    if (!titulo.trim() || enviando) return;
    setEnviando(true);
    const fechaAlerta = fecha && hora ? `${fecha}T${hora}` : fecha ? `${fecha}T09:00` : null;
    onCrear({
      id: genId(),
      titulo: titulo.trim(),
      descripcion: desc,
      fecha: fecha ? new Date(fecha).toISOString() : new Date().toISOString(),
      alerta,
      fechaAlerta,
      estado: "pendiente",
      creadoPor: usuarioId,
    });
    setTitulo(""); setDesc(""); setFecha(""); setHora(""); setAlerta(false); setCreando(false); setEnviando(false);
  };

  return (
    <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "#00000099", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: 20, overflowY: "auto" }}>
      <div className="modal-box" style={{ background: darkMode ? "#111827" : "#FFFFFF", border: `1px solid ${darkMode ? "#2E3A55" : "#CBD5E1"}`, borderRadius: 14, width: "100%", maxWidth: 520, padding: 28, boxShadow: "0 24px 80px #0008", margin: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: darkMode ? "#E2E8F0" : "#0F172A" }}>📝 Mis Tickets Personales</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: darkMode ? "#64748B" : "#475569", fontSize: 24, cursor: "pointer" }}>×</button>
        </div>

        {/* Formulario nuevo ticket */}
        {creando ? (
          <div style={{ background: darkMode ? "#1A2235" : "#F8FAFC", borderRadius: 10, padding: 16, marginBottom: 20, border: `1px solid ${darkMode ? "#2E3A55" : "#CBD5E1"}` }}>
            <p style={{ margin: "0 0 12px", color: darkMode ? "#94A3B8" : "#334155", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Nuevo ticket personal</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input style={inp2} value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título *" />
              <textarea style={{ ...inp2, resize: "vertical", minHeight: 60 }} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descripción..." />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", color: darkMode ? "#64748B" : "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Fecha</label>
                  <input type="date" style={{ ...inp2, colorScheme: "dark" }} value={fecha} onChange={e => setFecha(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: "block", color: darkMode ? "#64748B" : "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Hora alerta</label>
                  <input type="time" style={{ ...inp2, colorScheme: "dark" }} value={hora} onChange={e => setHora(e.target.value)} />
                </div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={alerta} onChange={e => setAlerta(e.target.checked)} style={{ accentColor: "#3182CE", width: 15, height: 15 }} />
                <span style={{ color: darkMode ? "#94A3B8" : "#334155", fontSize: 13 }}>🔔 Activar notificación en el navegador</span>
              </label>
              {alerta && <p style={{ margin: 0, color: darkMode ? "#64748B" : "#475569", fontSize: 11 }}>⚠️ Asegúrate de tener los permisos de notificación activados en el navegador.</p>}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
              <button onClick={() => setCreando(false)} style={{ fontFamily: "inherit", fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 6, border: "none", cursor: "pointer", background: darkMode ? "#1E293B" : "#E2E8F0", color: darkMode ? "#94A3B8" : "#334155" }}>Cancelar</button>
              <button onClick={submit} disabled={!titulo.trim() || enviando} style={{ fontFamily: "inherit", fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 6, border: "none", cursor: (titulo.trim() && !enviando) ? "pointer" : "not-allowed", background: (titulo.trim() && !enviando) ? "#3182CE" : darkMode ? "#1E293B" : "#E2E8F0", color: (titulo.trim() && !enviando) ? "#fff" : "#475569" }}>{enviando ? "Creando..." : "Crear"}</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setCreando(true)} style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 700, padding: "9px 18px", borderRadius: 8, border: "1px dashed #2E3A55", cursor: "pointer", background: "transparent", color: darkMode ? "#64748B" : "#475569", width: "100%", marginBottom: 20 }}>
            + Nuevo ticket personal
          </button>
        )}

        {/* Lista pendientes */}
        {pendientes.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: "0 0 8px", color: darkMode ? "#64748B" : "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Pendientes ({pendientes.length})</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {pendientes.map(t => (
                <div key={t.id} onClick={() => onVerDetalle(t)} style={{ background: darkMode ? "#1A2235" : "#F8FAFC", borderRadius: 8, padding: "10px 14px", border: `1px solid ${darkMode ? "#2E3A55" : "#CBD5E1"}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
                  onMouseEnter={e => e.currentTarget.style.background = "#1E2D45"}
                  onMouseLeave={e => e.currentTarget.style.background = "#1A2235"}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>📝</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, color: darkMode ? "#E2E8F0" : "#0F172A", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.titulo}</p>
                    {t.fecha && <p style={{ margin: "2px 0 0", color: darkMode ? "#475569" : "#64748B", fontSize: 11 }}>{fmtFecha(t.fecha)}{t.alerta ? " 🔔" : ""}</p>}
                  </div>
                  <span style={{ color: "#718096", fontSize: 11, background: darkMode ? "#111827" : "#FFFFFF", borderRadius: 4, padding: "2px 7px", flexShrink: 0 }}>pendiente</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista hechos */}
        {hechos.length > 0 && (
          <div>
            <p style={{ margin: "0 0 8px", color: darkMode ? "#64748B" : "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Completados ({hechos.length})</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {hechos.map(t => (
                <div key={t.id} onClick={() => onVerDetalle(t)} style={{ background: darkMode ? "#111827" : "#FFFFFF", borderRadius: 8, padding: "10px 14px", border: `1px solid ${darkMode ? "#1E293B" : "#E2E8F0"}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, opacity: 0.6 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>✅</span>
                  <p style={{ margin: 0, color: darkMode ? "#64748B" : "#475569", fontSize: 13, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: "line-through" }}>{t.titulo}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tickets.length === 0 && !creando && (
          <div style={{ textAlign: "center", padding: "30px 0" }}>
            <p style={{ fontSize: 40, marginBottom: 8 }}>📋</p>
            <p style={{ color: darkMode ? "#475569" : "#64748B", fontSize: 13 }}>No tienes tickets personales aún</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MODAL DETALLE MI TICKET ──────────────────────────────────────────────────
function ModalDetalleMiTicket({ ticket, onClose, onActualizar }) {
  const darkMode = __darkMode;
  const [editando, setEditando] = useState(false);
  const [titulo, setTitulo]     = useState(ticket.titulo);
  const [desc, setDesc]         = useState(ticket.descripcion || "");

  const marcarHecho = () => onActualizar({ ...ticket, estado: "hecho" });
  const marcarPendiente = () => onActualizar({ ...ticket, estado: "pendiente" });
  const guardar = () => { onActualizar({ ...ticket, titulo: titulo.trim(), descripcion: desc }); setEditando(false); };
  const hecho = ticket.estado === "hecho";

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000099", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 20 }}>
      <div className="modal-box" style={{ background: darkMode ? "#111827" : "#FFFFFF", border: `1px solid ${darkMode ? "#2E3A55" : "#CBD5E1"}`, borderRadius: 14, width: "100%", maxWidth: 480, padding: 28, boxShadow: "0 24px 80px #0008" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div style={{ flex: 1, marginRight: 12 }}>
            <span style={{ background: hecho ? "#38A16922" : "#71809622", color: hecho ? "#38A169" : "#718096", border: `1px solid ${hecho ? "#38A16955" : "#71809655"}`, borderRadius: 4, padding: "2px 9px", fontSize: 11, fontWeight: 700 }}>
              {hecho ? "✓ Hecho" : "⏳ Pendiente"}
            </span>
            {!editando
              ? <h2 style={{ margin: "8px 0 0", fontSize: 17, fontWeight: 800, color: darkMode ? "#E2E8F0" : "#0F172A" }}>{ticket.titulo}</h2>
              : <input style={{ fontFamily: "inherit", fontSize: 15, fontWeight: 700, background: darkMode ? "#1A2235" : "#F8FAFC", border: `1px solid ${darkMode ? "#2E3A55" : "#CBD5E1"}`, borderRadius: 6, padding: "7px 10px", color: darkMode ? "#E2E8F0" : "#0F172A", outline: "none", width: "100%", marginTop: 8, boxSizing: "border-box" }} value={titulo} onChange={e => setTitulo(e.target.value)} />
            }
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: darkMode ? "#64748B" : "#475569", fontSize: 24, cursor: "pointer" }}>×</button>
        </div>

        {ticket.fecha && <p style={{ margin: "0 0 12px", color: darkMode ? "#475569" : "#64748B", fontSize: 12 }}>📅 {fmtFecha(ticket.fecha)}{ticket.alerta ? "  🔔 Con notificación" : ""}</p>}

        {!editando
          ? ticket.descripcion && <div style={{ background: darkMode ? "#1A2235" : "#F8FAFC", borderRadius: 8, padding: 14, marginBottom: 16 }}><p style={{ margin: 0, color: darkMode ? "#94A3B8" : "#334155", fontSize: 13, lineHeight: 1.7 }}>{ticket.descripcion}</p></div>
          : <textarea style={{ fontFamily: "inherit", fontSize: 13, background: darkMode ? "#1A2235" : "#F8FAFC", border: `1px solid ${darkMode ? "#2E3A55" : "#CBD5E1"}`, borderRadius: 6, padding: "9px 12px", color: darkMode ? "#E2E8F0" : "#0F172A", outline: "none", width: "100%", boxSizing: "border-box", resize: "vertical", minHeight: 80, marginBottom: 16 }} value={desc} onChange={e => setDesc(e.target.value)} />
        }

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          {editando
            ? <><button onClick={() => setEditando(false)} style={{ fontFamily: "inherit", fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 6, border: "none", cursor: "pointer", background: darkMode ? "#1E293B" : "#E2E8F0", color: darkMode ? "#94A3B8" : "#334155" }}>Cancelar</button>
                <button onClick={guardar} style={{ fontFamily: "inherit", fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 6, border: "none", cursor: "pointer", background: "#3182CE", color: "#fff" }}>Guardar</button></>
            : <><button onClick={() => setEditando(true)} style={{ fontFamily: "inherit", fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 6, border: "none", cursor: "pointer", background: darkMode ? "#1E293B" : "#E2E8F0", color: darkMode ? "#94A3B8" : "#334155" }}>✏️ Editar</button>
                {hecho
                  ? <button onClick={marcarPendiente} style={{ fontFamily: "inherit", fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 6, border: "none", cursor: "pointer", background: darkMode ? "#1E293B" : "#E2E8F0", color: darkMode ? "#94A3B8" : "#334155" }}>↩️ Marcar pendiente</button>
                  : <button onClick={marcarHecho} style={{ fontFamily: "inherit", fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 6, border: "none", cursor: "pointer", background: "#38A169", color: "#fff" }}>✅ Marcar como hecho</button>
                }</>
          }
        </div>
      </div>
    </div>
  );
}

// ─── MODAL ADMINISTRACIÓN ─────────────────────────────────────────────────────
function ModalAdministracion({ onClose }) {
  const darkMode = __darkMode;
  const [tab, setTab] = useState("empresas");

  // ── Estado local reactivo ──
  const [empresas,    setEmpresas]    = useState(() => JSON.parse(JSON.stringify(EMPRESAS)));
  const [usuarios,    setUsuarios]    = useState(() => JSON.parse(JSON.stringify(USUARIOS)));
  const [categorias,  setCategorias]  = useState(() => [...CATEGORIAS]);
  const [estados,     setEstados]     = useState(() => [...ESTADOS]);

  // ── Forms ──
  const [formEmp,  setFormEmp]  = useState(null); // null | {id,nombre,color,inicial} | "nueva"
  const [formUser, setFormUser] = useState(null);
  const [formCat,  setFormCat]  = useState(null);
  const [formEst,  setFormEst]  = useState(null);

  const inp2  = { fontFamily:"inherit", fontSize:13, background:"#0D1424", border:"1px solid #2E3A55", borderRadius:6, padding:"8px 11px", color:"#E2E8F0", outline:"none", width:"100%", boxSizing:"border-box" };
  const label2 = { display:"block", color:"#64748B", fontSize:10, fontWeight:700, textTransform:"uppercase", marginBottom:4 };
  const btnPri = { fontFamily:"inherit", fontSize:12, fontWeight:700, padding:"8px 16px", borderRadius:6, border:"none", cursor:"pointer", background:"#3182CE", color:"#fff" };
  const btnSec = { fontFamily:"inherit", fontSize:12, fontWeight:700, padding:"8px 16px", borderRadius:6, border:"none", cursor:"pointer", background:"#1E293B", color:"#94A3B8" };
  const btnDel = { fontFamily:"inherit", fontSize:11, fontWeight:700, padding:"5px 10px", borderRadius:5, border:"none", cursor:"pointer", background:"#E53E3E22", color:"#E53E3E" };

  const persistConfig = async (key, value) => {
    try { await setDoc(doc(db, "config", key), { value: JSON.stringify(value) }); } catch {}
  };

  // ════ EMPRESAS ════
  const guardarEmpresa = () => {
    if (!formEmp?.nombre?.trim()) return;
    let nuevas;
    if (formEmp.id === "nueva") {
      const newId = Math.max(...empresas.map(e => e.id)) + 1;
      const nueva = { id: newId, nombre: formEmp.nombre.trim(), color: formEmp.color || "#94A3B8", inicial: formEmp.nombre.trim().slice(0,2).toUpperCase() };
      nuevas = [...empresas, nueva];
      EMPRESAS.push(nueva);
    } else {
      nuevas = empresas.map(e => e.id === formEmp.id ? { ...e, nombre: formEmp.nombre.trim(), color: formEmp.color, inicial: formEmp.nombre.trim().slice(0,2).toUpperCase() } : e);
      const idx = EMPRESAS.findIndex(e => e.id === formEmp.id);
      if (idx >= 0) EMPRESAS[idx] = { ...EMPRESAS[idx], nombre: formEmp.nombre.trim(), color: formEmp.color, inicial: formEmp.nombre.trim().slice(0,2).toUpperCase() };
    }
    setEmpresas(nuevas);
    persistConfig("empresas", nuevas);
    setFormEmp(null);
  };

  const eliminarEmpresa = (id) => {
    if (!window.confirm("¿Eliminar esta empresa? Los tickets existentes no se verán afectados.")) return;
    const nuevas = empresas.filter(e => e.id !== id);
    const idx = EMPRESAS.findIndex(e => e.id === id);
    if (idx >= 0) EMPRESAS.splice(idx, 1);
    setEmpresas(nuevas);
    persistConfig("empresas", nuevas);
  };

  // ════ USUARIOS ════
  const [guardandoUsuario, setGuardandoUsuario] = useState(false);
  const [errorUsuario, setErrorUsuario] = useState("");
  const guardarUsuario = async () => {
    if (!formUser?.nombre?.trim()) return;
    setErrorUsuario("");
    setGuardandoUsuario(true);
    try {
      let nuevos;
      if (formUser.id === "nuevo") {
        const newId = Math.max(...usuarios.map(u => u.id)) + 1;
        const nuevo = { id: newId, nombre: formUser.nombre.trim(), empresaId: Number(formUser.empresaId), rol: formUser.rol || "trabajador", activo: true };
        // Persistir identidad del nuevo usuario en Firestore PRIMERO — si esto
        // falla, no tocamos el estado local, para no dar una falsa sensación
        // de guardado que luego no aparece en otros dispositivos.
        await setDoc(doc(db, "usuariosNuevos", String(newId)), { nombre: nuevo.nombre, empresaId: nuevo.empresaId, rol: nuevo.rol, pin: "1234" });
        PINS_DEFAULT[newId] = "1234";
        nuevos = [...usuarios, nuevo];
        USUARIOS.push(nuevo);
      } else {
        nuevos = usuarios.map(u => u.id === formUser.id ? { ...u, nombre: formUser.nombre.trim(), empresaId: Number(formUser.empresaId), rol: formUser.rol, activo: formUser.activo } : u);
        await setDoc(doc(db, "estadoUsuarios", String(formUser.id)), { activo: formUser.activo !== false });
        if (Number(formUser.id) > 46) {
          await setDoc(doc(db, "usuariosNuevos", String(formUser.id)), { nombre: formUser.nombre.trim(), empresaId: Number(formUser.empresaId), rol: formUser.rol }, { merge: true });
        }
        const idx = USUARIOS.findIndex(u => u.id === formUser.id);
        if (idx >= 0) USUARIOS[idx] = { ...USUARIOS[idx], ...formUser, empresaId: Number(formUser.empresaId) };
      }
      setUsuarios(nuevos);
      persistConfig("usuarios", nuevos);
      setFormUser(null);
    } catch (e) {
      console.error("Error guardando usuario:", e);
      setErrorUsuario("No se pudo guardar. Revisa tu conexión e inténtalo de nuevo — el cambio NO se ha aplicado.");
    } finally {
      setGuardandoUsuario(false);
    }
  };

  const toggleActivo = async (id) => {
    const actualActivo = USUARIOS.find(u => u.id === id)?.activo !== false;
    const nuevoActivo = !actualActivo;
    const nuevos = usuarios.map(u => u.id === id ? { ...u, activo: nuevoActivo } : u);
    const idx = USUARIOS.findIndex(u => u.id === id);
    if (idx >= 0) USUARIOS[idx].activo = nuevoActivo;
    setUsuarios(nuevos);
    try { await setDoc(doc(db, "estadoUsuarios", String(id)), { activo: nuevoActivo }); } catch {}
  };

  // Restablecer el PIN de cualquier usuario a 1234. Al borrar su entrada en
  // Firestore ("pins"), la próxima vez que entre la app le obligará a elegir
  // uno nuevo (el mismo mecanismo del primer acceso).
  const [avisoPinReset, setAvisoPinReset] = useState("");
  const restablecerPin = async (u) => {
    if (!window.confirm(`¿Restablecer el PIN de ${u.nombre} a 1234? Tendrá que elegir uno nuevo la próxima vez que entre.`)) return;
    try {
      await deleteDoc(doc(db, "pins", String(u.id)));
      setAvisoPinReset(`✅ PIN de ${u.nombre} restablecido a 1234.`);
    } catch {
      setAvisoPinReset(`❌ No se pudo restablecer el PIN de ${u.nombre}. Inténtalo de nuevo.`);
    }
  };

  const eliminarUsuario = async (id) => {
    if (!window.confirm("¿Eliminar este usuario?")) return;
    if (Number(id) > 46) {
      try {
        await deleteDoc(doc(db, "usuariosNuevos", String(id)));
        await deleteDoc(doc(db, "estadoUsuarios", String(id)));
      } catch (e) {
        console.error("Error eliminando usuario:", e);
        alert("No se pudo eliminar. Revisa tu conexión e inténtalo de nuevo — el usuario NO se ha borrado.");
        return;
      }
    }
    const nuevos = usuarios.filter(u => u.id !== id);
    const idx = USUARIOS.findIndex(u => u.id === id);
    if (idx >= 0) USUARIOS.splice(idx, 1);
    setUsuarios(nuevos);
    persistConfig("usuarios", nuevos);
  };

  // ════ CATEGORÍAS ════
  const guardarCategoria = () => {
    if (!formCat?.valor?.trim()) return;
    let nuevas;
    if (formCat._esNueva) {
      nuevas = [...categorias, formCat.valor.trim()];
      CATEGORIAS.push(formCat.valor.trim());
    } else {
      nuevas = categorias.map(c => c === formCat._original ? formCat.valor : c);
      const idx = CATEGORIAS.indexOf(formCat._original);
      if (idx >= 0) CATEGORIAS[idx] = formCat.valor;
    }
    setCategorias(nuevas);
    persistConfig("categorias", nuevas);
    setFormCat(null);
  };

  const eliminarCategoria = (cat) => {
    if (!window.confirm(`¿Eliminar categoría "${cat}"?`)) return;
    const nuevas = categorias.filter(c => c !== cat);
    const idx = CATEGORIAS.indexOf(cat);
    if (idx >= 0) CATEGORIAS.splice(idx, 1);
    setCategorias(nuevas);
    persistConfig("categorias", nuevas);
  };

  // ════ ESTADOS ════
  const guardarEstado = () => {
    if (!formEst?.valor?.trim()) return;
    let nuevos;
    if (formEst._esNuevo) {
      nuevos = [...estados, formEst.valor.trim()];
      ESTADOS.push(formEst.valor.trim());
    } else {
      nuevos = estados.map(e => e === formEst._original ? formEst.valor.trim() : e);
      const idx = ESTADOS.indexOf(formEst._original);
      if (idx >= 0) ESTADOS[idx] = formEst.valor.trim();
    }
    setEstados(nuevos);
    persistConfig("estados", nuevos);
    setFormEst(null);
  };

  const eliminarEstado = (est) => {
    if (!window.confirm(`¿Eliminar estado "${est}"?`)) return;
    const nuevos = estados.filter(e => e !== est);
    const idx = ESTADOS.indexOf(est);
    if (idx >= 0) ESTADOS.splice(idx, 1);
    setEstados(nuevos);
    persistConfig("estados", nuevos);
  };

  const TABS = [["empresas","🏢 Empresas"],["usuarios","👥 Usuarios"],["categorias","🏷️ Categorías"],["estados","📊 Estados"]];
  const ROLES = ["trabajador","encargado","director","administrador"];
  const COLORES_PRESET = ["#E53E3E","#D4A017","#2B6CB0","#805AD5","#276749","#38A169","#E53E3E","#94A3B8","#DD6B20","#0BC5EA"];

  return (
    <div style={{ position:"fixed", inset:0, background:"#00000099", display:"flex", alignItems:"flex-start", justifyContent:"center", zIndex:2000, padding:20, overflowY:"auto" }}>
      <div style={{ background:"#0D1424", border:"1px solid #2E3A55", borderRadius:16, width:"100%", maxWidth:720, padding:0, boxShadow:"0 24px 80px #0009", margin:"auto", overflow:"hidden" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"20px 28px", borderBottom:"1px solid #1E293B", background:"#111827" }}>
          <h2 style={{ margin:0, fontSize:18, fontWeight:900, color:"#E2E8F0" }}>⚙️ Administración</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#64748B", fontSize:24, cursor:"pointer" }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", borderBottom:"1px solid #1E293B", background:"#111827" }}>
          {TABS.map(([key, label]) => (
            <button key={key} onClick={() => { setTab(key); setFormEmp(null); setFormUser(null); setFormCat(null); setFormEst(null); }}
              style={{ fontFamily:"inherit", flex:1, padding:"12px 0", border:"none", cursor:"pointer", fontSize:12, fontWeight:700,
                background: tab === key ? "#0D1424" : "transparent",
                color: tab === key ? "#E2E8F0" : "#475569",
                borderBottom: tab === key ? "2px solid #3182CE" : "2px solid transparent" }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ padding:24, maxHeight:"70vh", overflowY:"auto" }}>

          {/* ── EMPRESAS ── */}
          {tab === "empresas" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <p style={{ margin:0, color:"#64748B", fontSize:12 }}>{empresas.length} empresa{empresas.length !== 1 ? "s" : ""}</p>
                <button onClick={() => setFormEmp({ id:"nueva", nombre:"", color:"#94A3B8", inicial:"" })} style={{ ...btnPri, fontSize:11 }}>+ Nueva empresa</button>
              </div>

              {formEmp && (
                <div style={{ background:"#111827", borderRadius:10, padding:16, marginBottom:16, border:"1px solid #3182CE55" }}>
                  <p style={{ margin:"0 0 14px", color:"#93C5FD", fontSize:11, fontWeight:700, textTransform:"uppercase" }}>{formEmp.id === "nueva" ? "Nueva empresa" : "Editar empresa"}</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    <div><label style={label2}>Nombre</label><input style={inp2} value={formEmp.nombre} onChange={e => setFormEmp(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre de la empresa" /></div>
                    <div>
                      <label style={label2}>Color</label>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                        {COLORES_PRESET.map(c => (
                          <div key={c} onClick={() => setFormEmp(f => ({ ...f, color: c }))}
                            style={{ width:28, height:28, borderRadius:"50%", background:c, cursor:"pointer", border: formEmp.color === c ? "3px solid #fff" : "2px solid transparent" }} />
                        ))}
                        <input type="color" value={formEmp.color} onChange={e => setFormEmp(f => ({ ...f, color: e.target.value }))}
                          style={{ width:28, height:28, borderRadius:"50%", border:"none", cursor:"pointer", background:"none", padding:0 }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:14 }}>
                    <button onClick={() => setFormEmp(null)} style={btnSec}>Cancelar</button>
                    <button onClick={guardarEmpresa} style={btnPri}>Guardar</button>
                  </div>
                </div>
              )}

              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {empresas.map(emp => (
                  <div key={emp.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", background:"#111827", borderRadius:8, border:"1px solid #1E293B" }}>
                    <div style={{ width:14, height:14, borderRadius:"50%", background:emp.color, flexShrink:0 }} />
                    <span style={{ color:"#E2E8F0", fontSize:13, fontWeight:600, flex:1 }}>{emp.nombre}</span>
                    <span style={{ color:"#475569", fontSize:11, background:"#1E293B", borderRadius:4, padding:"2px 7px" }}>{emp.inicial}</span>
                    <button onClick={() => setFormEmp({ ...emp })} style={{ ...btnSec, padding:"5px 10px", fontSize:11 }}>✏️ Editar</button>
                    {emp.id !== 0 && <button onClick={() => eliminarEmpresa(emp.id)} style={btnDel}>🗑️</button>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── USUARIOS ── */}
          {tab === "usuarios" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <p style={{ margin:0, color:"#64748B", fontSize:12 }}>{usuarios.length} usuario{usuarios.length !== 1 ? "s" : ""}</p>
                <button onClick={() => setFormUser({ id:"nuevo", nombre:"", empresaId:1, rol:"trabajador", activo:true })} style={{ ...btnPri, fontSize:11 }}>+ Nuevo usuario</button>
              </div>

              {formUser && (
                <div style={{ background:"#111827", borderRadius:10, padding:16, marginBottom:16, border:"1px solid #3182CE55" }}>
                  <p style={{ margin:"0 0 14px", color:"#93C5FD", fontSize:11, fontWeight:700, textTransform:"uppercase" }}>{formUser.id === "nuevo" ? "Nuevo usuario" : "Editar usuario"}</p>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                    <div style={{ gridColumn:"1/-1" }}><label style={label2}>Nombre completo</label><input style={inp2} value={formUser.nombre} onChange={e => setFormUser(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre y apellidos" /></div>
                    <div>
                      <label style={label2}>Empresa</label>
                      <select style={{ ...inp2 }} value={formUser.empresaId} onChange={e => setFormUser(f => ({ ...f, empresaId: e.target.value }))}>
                        {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={label2}>Rol</label>
                      <select style={{ ...inp2 }} value={formUser.rol} onChange={e => setFormUser(f => ({ ...f, rol: e.target.value }))}>
                        {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                      </select>
                    </div>
                  </div>
                  {errorUsuario && <p style={{ margin:"10px 0 0", color:"#E53E3E", fontSize:12, fontWeight:600 }}>{errorUsuario}</p>}
                  <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:14 }}>
                    <button onClick={() => { setFormUser(null); setErrorUsuario(""); }} style={btnSec}>Cancelar</button>
                    <button onClick={guardarUsuario} disabled={guardandoUsuario} style={{ ...btnPri, opacity: guardandoUsuario ? 0.6 : 1 }}>{guardandoUsuario ? "Guardando…" : "Guardar"}</button>
                  </div>
                </div>
              )}

              {avisoPinReset && (
                <div style={{ background:"#3182CE22", border:"1px solid #3182CE55", borderRadius:10, padding:"10px 14px", marginBottom:16 }}>
                  <p style={{ margin:0, color:"#93C5FD", fontSize:12 }}>{avisoPinReset}</p>
                </div>
              )}

              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {usuarios.map(u => {
                  const emp = empresas.find(e => e.id === u.empresaId);
                  const activo = u.activo !== false;
                  return (
                    <div key={u.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"#111827", borderRadius:8, border:"1px solid #1E293B", opacity: activo ? 1 : 0.5 }}>
                      <Avatar nombre={u.nombre} color={emp?.color || "#94A3B8"} size={30} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ margin:0, color: activo ? "#E2E8F0" : "#64748B", fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{u.nombre}</p>
                        <p style={{ margin:0, color:"#475569", fontSize:11 }}>{emp?.nombre} · <span style={{ color: u.rol === "director" ? "#F6AD55" : u.rol === "administrador" ? "#805AD5" : u.rol === "encargado" ? "#3182CE" : "#475569" }}>{u.rol}</span></p>
                      </div>
                      <button onClick={() => restablecerPin(u)} title="Restablecer PIN a 1234" style={{ ...btnSec, padding:"4px 9px", fontSize:10 }}>🔁 PIN</button>
                      <button onClick={() => toggleActivo(u.id)} style={{ ...btnSec, padding:"4px 9px", fontSize:10 }}>{activo ? "🟢 Activo" : "🔴 Inactivo"}</button>
                      <button onClick={() => setFormUser({ ...u })} style={{ ...btnSec, padding:"5px 10px", fontSize:11 }}>✏️</button>
                      {u.id !== 0 && <button onClick={() => eliminarUsuario(u.id)} style={btnDel}>🗑️</button>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── CATEGORÍAS ── */}
          {tab === "categorias" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <p style={{ margin:0, color:"#64748B", fontSize:12 }}>{categorias.length} categoría{categorias.length !== 1 ? "s" : ""}</p>
                <button onClick={() => setFormCat({ _esNueva:true, valor:"" })} style={{ ...btnPri, fontSize:11 }}>+ Nueva categoría</button>
              </div>

              {formCat && (
                <div style={{ background:"#111827", borderRadius:10, padding:16, marginBottom:16, border:"1px solid #3182CE55" }}>
                  <p style={{ margin:"0 0 10px", color:"#93C5FD", fontSize:11, fontWeight:700, textTransform:"uppercase" }}>{formCat._esNueva ? "Nueva categoría" : "Editar categoría"}</p>
                  <input style={inp2} value={formCat.valor} onChange={e => setFormCat(f => ({ ...f, valor: e.target.value }))} placeholder="Nombre de la categoría" />
                  <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:12 }}>
                    <button onClick={() => setFormCat(null)} style={btnSec}>Cancelar</button>
                    <button onClick={guardarCategoria} style={btnPri}>Guardar</button>
                  </div>
                </div>
              )}

              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {categorias.map((cat, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"#111827", borderRadius:8, border:"1px solid #1E293B" }}>
                    <span style={{ fontSize:16 }}>🏷️</span>
                    <span style={{ color:"#E2E8F0", fontSize:13, fontWeight:600, flex:1 }}>{cat}</span>
                    <button onClick={() => setFormCat({ _esNueva:false, _original:cat, valor:cat })} style={{ ...btnSec, padding:"5px 10px", fontSize:11 }}>✏️ Editar</button>
                    <button onClick={() => eliminarCategoria(cat)} style={btnDel}>🗑️</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── ESTADOS ── */}
          {tab === "estados" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <p style={{ margin:0, color:"#64748B", fontSize:12 }}>{estados.length} estado{estados.length !== 1 ? "s" : ""}</p>
                <button onClick={() => setFormEst({ _esNuevo:true, valor:"" })} style={{ ...btnPri, fontSize:11 }}>+ Nuevo estado</button>
              </div>

              {formEst && (
                <div style={{ background:"#111827", borderRadius:10, padding:16, marginBottom:16, border:"1px solid #3182CE55" }}>
                  <p style={{ margin:"0 0 10px", color:"#93C5FD", fontSize:11, fontWeight:700, textTransform:"uppercase" }}>{formEst._esNuevo ? "Nuevo estado" : "Editar estado"}</p>
                  <input style={inp2} value={formEst.valor} onChange={e => setFormEst(f => ({ ...f, valor: e.target.value }))} placeholder="Nombre del estado" />
                  <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:12 }}>
                    <button onClick={() => setFormEst(null)} style={btnSec}>Cancelar</button>
                    <button onClick={guardarEstado} style={btnPri}>Guardar</button>
                  </div>
                </div>
              )}

              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {estados.map((est, i) => {
                  const col = ESTADO_COLORES[est] || "#64748B";
                  return (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"#111827", borderRadius:8, border:"1px solid #1E293B" }}>
                      <span style={{ width:10, height:10, borderRadius:"50%", background:col, flexShrink:0 }} />
                      <span style={{ color:"#E2E8F0", fontSize:13, fontWeight:600, flex:1 }}>{est}</span>
                      <Badge texto={est} color={col} small />
                      <button onClick={() => setFormEst({ _esNuevo:false, _original:est, valor:est })} style={{ ...btnSec, padding:"5px 10px", fontSize:11 }}>✏️ Editar</button>
                      <button onClick={() => eliminarEstado(est)} style={btnDel}>🗑️</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function ModalComunicado({ darkMode, usuarioId, empresaId, onClose, comunicadoInicial }) {
  const esEdicion = Boolean(comunicadoInicial);

  const [titulo,         setTitulo]         = useState(comunicadoInicial?.titulo        || "");
  const [cuerpo,         setCuerpo]         = useState(comunicadoInicial?.cuerpo        || "");
  const [fechaCaducidad, setFechaCaducidad] = useState(comunicadoInicial?.fechaCaducidad || "");
  const [adjuntoPDF,     setAdjuntoPDF]     = useState(comunicadoInicial?.adjuntoPDF    || null);
  const [cargandoPDF,    setCargandoPDF]    = useState(false);

  // ── Destinatarios ──
  const [tipoDestinatario, setTipoDestinatario] = useState(comunicadoInicial?.destinatarios?.tipo || "todos");
  const [empresasSel,      setEmpresasSel]      = useState(comunicadoInicial?.destinatarios?.empresaIds || []);
  const [usuariosSel,      setUsuariosSel]      = useState(comunicadoInicial?.destinatarios?.usuarioIds || []);
  const [filtroUsuario,    setFiltroUsuario]     = useState("");

  const toggleEmpresa = (id) => setEmpresasSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleUsuario = (id) => setUsuariosSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // Seleccionar todos los usuarios de una empresa de golpe
  const toggleEmpresaUsuarios = (empId) => {
    const idsEmp = USUARIOS.filter(u => u.empresaId === empId).map(u => u.id);
    const todosYa = idsEmp.every(id => usuariosSel.includes(id));
    if (todosYa) setUsuariosSel(prev => prev.filter(id => !idsEmp.includes(id)));
    else         setUsuariosSel(prev => [...new Set([...prev, ...idsEmp])]);
  };

  const handlePDF = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== "application/pdf") { alert("Solo se permiten archivos PDF."); return; }
    if (file.size > MAX_ARCHIVO_BYTES)  { alert("El archivo no puede superar los 700 KB."); return; }
    setCargandoPDF(true);
    const r = new FileReader();
    r.onload  = () => { setAdjuntoPDF({ nombre: file.name, dataUrl: r.result }); setCargandoPDF(false); };
    r.onerror = () => { alert("Error al leer el archivo."); setCargandoPDF(false); };
    r.readAsDataURL(file);
  };

  const canPublicar = titulo.trim() && !cargandoPDF &&
    (tipoDestinatario === "todos" ||
    (tipoDestinatario === "empresas" && empresasSel.length > 0) ||
    (tipoDestinatario === "usuarios" && usuariosSel.length > 0));

  const enviar = async () => {
    if (!canPublicar) return;
    const destinatarios = tipoDestinatario === "todos"
      ? { tipo: "todos" }
      : tipoDestinatario === "empresas"
        ? { tipo: "empresas", empresaIds: empresasSel }
        : { tipo: "usuarios", usuarioIds: usuariosSel };

    if (esEdicion) {
      // Editar comunicado existente — preservar id, autor y fecha original
      await setDoc(doc(db, "comunicados", comunicadoInicial.id), {
        ...comunicadoInicial,
        titulo:         titulo.trim(),
        cuerpo:         cuerpo.trim() || null,
        fechaCaducidad: fechaCaducidad || null,
        adjuntoPDF:     adjuntoPDF || null,
        destinatarios,
        fechaEditado:   new Date().toISOString(),
      });
    } else {
      // Crear comunicado nuevo
      const id = String(Date.now());
      await setDoc(doc(db, "comunicados", id), {
        id,
        titulo:         titulo.trim(),
        cuerpo:         cuerpo.trim() || null,
        autorId:        usuarioId,
        empresaId:      empresaId,
        fecha:          new Date().toISOString(),
        fechaCaducidad: fechaCaducidad || null,
        adjuntoPDF:     adjuntoPDF || null,
        destinatarios,
      });
    }
    onClose();
  };

  const overlay = { position:"fixed", inset:0, background:"#00000088", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16 };
  const box     = { background: darkMode ? "#111827" : "#FFFFFF", borderRadius:14, width:"100%", maxWidth:520, padding:24, boxShadow:"0 24px 60px #0008", maxHeight:"90vh", overflowY:"auto" };
  const inp     = { width:"100%", padding:"9px 12px", background: darkMode ? "#1A2235" : "#F8FAFC", border:`1px solid ${darkMode ? "#2E3A55" : "#CBD5E1"}`, borderRadius:8, color: darkMode ? "#E2E8F0" : "#0F172A", fontSize:13, fontFamily:"inherit", boxSizing:"border-box" };
  const labelS  = { display:"block", color: darkMode ? "#64748B" : "#475569", fontSize:11, fontWeight:700, textTransform:"uppercase", marginBottom:5 };
  const tabBtn  = (activo) => ({ padding:"6px 14px", borderRadius:7, border:`1px solid ${activo ? "#3182CE" : (darkMode ? "#2E3A55" : "#CBD5E1")}`, background: activo ? "#3182CE22" : "transparent", color: activo ? "#3182CE" : (darkMode ? "#64748B" : "#475569"), fontSize:12, fontWeight: activo ? 700 : 400, cursor:"pointer" });

  const usuariosFiltrados = USUARIOS.filter(u =>
    !filtroUsuario || u.nombre.toLowerCase().includes(filtroUsuario.toLowerCase())
  );

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={box}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h3 style={{ margin:0, color: darkMode ? "#E2E8F0" : "#0F172A", fontSize:16, fontWeight:800 }}>{esEdicion ? "✏️ Editar comunicado" : "💬 Nuevo comunicado"}</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", color: darkMode ? "#475569" : "#64748B", cursor:"pointer", fontSize:20 }}>×</button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

          {/* Título */}
          <div>
            <label style={labelS}>Título *</label>
            <input style={inp} placeholder="Ej: Reunión el viernes a las 10h" value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={120} />
          </div>

          {/* Mensaje */}
          <div>
            <label style={labelS}>Mensaje (opcional)</label>
            <textarea style={{ ...inp, minHeight:90, resize:"vertical" }} placeholder="Detalle del comunicado..." value={cuerpo} onChange={e => setCuerpo(e.target.value)} maxLength={600} />
          </div>

          {/* ── DESTINATARIOS ── */}
          <div>
            <label style={labelS}>👥 Destinatarios</label>
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              <button style={tabBtn(tipoDestinatario === "todos")}    onClick={() => setTipoDestinatario("todos")}>🌐 Todos</button>
              <button style={tabBtn(tipoDestinatario === "empresas")} onClick={() => setTipoDestinatario("empresas")}>🏢 Por empresa</button>
              <button style={tabBtn(tipoDestinatario === "usuarios")} onClick={() => setTipoDestinatario("usuarios")}>👤 Por usuario</button>
            </div>

            {/* Selector por empresa */}
            {tipoDestinatario === "empresas" && (
              <div style={{ display:"flex", flexDirection:"column", gap:6, background: darkMode ? "#0F172A" : "#F8FAFC", borderRadius:8, padding:10, border:`1px solid ${darkMode ? "#1E293B" : "#E2E8F0"}` }}>
                {EMPRESAS.map(emp => (
                  <label key={emp.id} style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", padding:"4px 6px", borderRadius:6, background: empresasSel.includes(emp.id) ? (darkMode ? "#1A2235" : "#EFF6FF") : "transparent" }}>
                    <input type="checkbox" checked={empresasSel.includes(emp.id)} onChange={() => toggleEmpresa(emp.id)} style={{ accentColor: emp.color }} />
                    <span style={{ width:10, height:10, borderRadius:"50%", background:emp.color, flexShrink:0 }} />
                    <span style={{ color: darkMode ? "#E2E8F0" : "#0F172A", fontSize:13, fontWeight: empresasSel.includes(emp.id) ? 700 : 400 }}>{emp.nombre}</span>
                  </label>
                ))}
                {empresasSel.length === 0 && <p style={{ margin:0, color:"#E53E3E", fontSize:11 }}>Selecciona al menos una empresa.</p>}
              </div>
            )}

            {/* Selector por usuario */}
            {tipoDestinatario === "usuarios" && (
              <div style={{ background: darkMode ? "#0F172A" : "#F8FAFC", borderRadius:8, padding:10, border:`1px solid ${darkMode ? "#1E293B" : "#E2E8F0"}` }}>
                {/* Buscador */}
                <input style={{ ...inp, marginBottom:8, fontSize:12, padding:"7px 10px" }} placeholder="🔍 Buscar usuario..." value={filtroUsuario} onChange={e => setFiltroUsuario(e.target.value)} />
                {/* Agrupados por empresa */}
                <div style={{ maxHeight:200, overflowY:"auto", display:"flex", flexDirection:"column", gap:10 }}>
                  {EMPRESAS.map(emp => {
                    const usrsEmp = usuariosFiltrados.filter(u => u.empresaId === emp.id);
                    if (usrsEmp.length === 0) return null;
                    const todosEmpSel = usrsEmp.every(u => usuariosSel.includes(u.id));
                    return (
                      <div key={emp.id}>
                        {/* Cabecera empresa — seleccionar todos */}
                        <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", marginBottom:4, paddingBottom:4, borderBottom:`1px solid ${darkMode ? "#1E293B" : "#E2E8F0"}` }}>
                          <input type="checkbox" checked={todosEmpSel} onChange={() => toggleEmpresaUsuarios(emp.id)} style={{ accentColor: emp.color }} />
                          <span style={{ width:8, height:8, borderRadius:"50%", background:emp.color }} />
                          <span style={{ color: emp.color, fontSize:11, fontWeight:800, textTransform:"uppercase" }}>{emp.nombre}</span>
                          <span style={{ color: darkMode ? "#475569" : "#94A3B8", fontSize:10 }}>({usrsEmp.length})</span>
                        </label>
                        {/* Usuarios de la empresa */}
                        <div style={{ display:"flex", flexDirection:"column", gap:3, paddingLeft:16 }}>
                          {usrsEmp.map(u => (
                            <label key={u.id} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", padding:"3px 6px", borderRadius:5, background: usuariosSel.includes(u.id) ? (darkMode ? "#1A2235" : "#EFF6FF") : "transparent" }}>
                              <input type="checkbox" checked={usuariosSel.includes(u.id)} onChange={() => toggleUsuario(u.id)} style={{ accentColor: emp.color }} />
                              <span style={{ color: darkMode ? "#E2E8F0" : "#0F172A", fontSize:12, fontWeight: usuariosSel.includes(u.id) ? 700 : 400 }}>{u.nombre}</span>
                              <span style={{ color: darkMode ? "#475569" : "#94A3B8", fontSize:10, marginLeft:"auto" }}>{u.rol}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {usuariosSel.length > 0 && (
                  <p style={{ margin:"8px 0 0", color:"#38A169", fontSize:11, fontWeight:700 }}>✓ {usuariosSel.length} usuario{usuariosSel.length > 1 ? "s" : ""} seleccionado{usuariosSel.length > 1 ? "s" : ""}</p>
                )}
                {usuariosSel.length === 0 && <p style={{ margin:"8px 0 0", color:"#E53E3E", fontSize:11 }}>Selecciona al menos un usuario.</p>}
              </div>
            )}
          </div>

          {/* Fecha caducidad */}
          <div>
            <label style={labelS}>📅 Fecha de caducidad (opcional)</label>
            <input type="date" style={{ ...inp, colorScheme:"dark" }} value={fechaCaducidad} onChange={e => setFechaCaducidad(e.target.value)} min={new Date().toISOString().split("T")[0]} />
            <p style={{ margin:"4px 0 0", color: darkMode ? "#475569" : "#94A3B8", fontSize:11 }}>Si no indicas fecha, el comunicado permanece hasta que lo elimines manualmente.</p>
          </div>

          {/* Adjunto PDF */}
          <div>
            <label style={labelS}>📎 Adjuntar PDF (opcional, máx. 5 MB)</label>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <label style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 14px", background: darkMode ? "#1A2235" : "#F8FAFC", border:`1px solid ${darkMode ? "#2E3A55" : "#CBD5E1"}`, borderRadius:8, cursor:"pointer", fontSize:12, color: darkMode ? "#94A3B8" : "#475569" }}>
                {cargandoPDF ? "⏳ Cargando..." : adjuntoPDF ? "🔄 Cambiar PDF" : "📄 Seleccionar PDF"}
                <input type="file" accept="application/pdf" onChange={handlePDF} style={{ display:"none" }} />
              </label>
              {adjuntoPDF && (
                <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 12px", background: darkMode ? "#1A223588" : "#EFF6FF", border:`1px solid ${darkMode ? "#2E3A5588" : "#BFDBFE"}`, borderRadius:8, flex:1 }}>
                  <span style={{ fontSize:16 }}>📄</span>
                  <span style={{ color: darkMode ? "#93C5FD" : "#1D4ED8", fontSize:12, fontWeight:600, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{adjuntoPDF.nombre}</span>
                  <button onClick={() => setAdjuntoPDF(null)} style={{ background:"none", border:"none", color: darkMode ? "#475569" : "#94A3B8", cursor:"pointer", fontSize:16, lineHeight:1, padding:0, flexShrink:0 }}>×</button>
                </div>
              )}
            </div>
          </div>

          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:4 }}>
            <button onClick={onClose} style={{ padding:"9px 20px", background:"transparent", border:`1px solid ${darkMode ? "#2E3A55" : "#CBD5E1"}`, borderRadius:8, color: darkMode ? "#64748B" : "#475569", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>Cancelar</button>
            <button onClick={enviar} disabled={!canPublicar} style={{ padding:"9px 20px", background: canPublicar ? "#3182CE" : "#3182CE55", border:"none", borderRadius:8, color:"#fff", fontSize:13, fontWeight:700, cursor: canPublicar ? "pointer" : "default", fontFamily:"inherit" }}>{esEdicion ? "💾 Guardar cambios" : "📤 Publicar"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Cierre automático de jornada: si un fichaje sigue abierto y ya pasaron las 15:00
// de ese día, devuelve la hora de salida (15:00) para cerrarlo. Si no, null.
function salidaAutomatica(f) {
  if (!f || f.salida) return null;
  const e = new Date(f.entrada);
  if (isNaN(e)) return null;
  const cierre = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 15, 0, 0);
  if (Date.now() <= cierre.getTime()) return null; // aún no han dado las 15:00 de ese día
  return (cierre.getTime() > e.getTime() ? cierre : e).toISOString();
}

function SeccionFichaje({ darkMode, fichajes, fichajeActivo, ficharEntrada, ficharSalida, vacaciones = [] }) {
  const [, forceRender] = useState(0);
  // Re-render every minute to update elapsed time
  useEffect(() => {
    if (!fichajeActivo) return;
    const t = setInterval(() => forceRender(n => n+1), 60000);
    return () => clearInterval(t);
  }, [fichajeActivo]);

  const hoy = new Date().toISOString().split("T")[0];
  const enVacacionesHoy = (vacaciones || []).some(v => hoy >= v.fechaInicio && hoy <= v.fechaFin);
  const fichajesHoy = fichajes.filter(f => f.fecha === hoy).sort((a,b) => new Date(b.entrada)-new Date(a.entrada));
  const durStr = (ms) => { const h=Math.floor(ms/3600000); const m=Math.floor((ms%3600000)/60000); return h>0?`${h}h ${m}min`:`${m}min`; };
  const duracionMs = fichajeActivo ? Date.now() - new Date(fichajeActivo.entrada).getTime() : 0;

  return (
    <div style={{ maxWidth:640 }}>
      <h2 style={{ margin:"0 0 4px", color: darkMode?"#E2E8F0":"#0F172A", fontWeight:800, fontSize:18 }}>🕐 Fichaje</h2>
      <p style={{ margin:"0 0 24px", color: darkMode?"#475569":"#64748B", fontSize:13 }}>Registra tu entrada y salida del trabajo</p>
      {enVacacionesHoy && (
        <div style={{ background:"#805AD518", border:"1px solid #805AD555", borderRadius:12, padding:"14px 18px", marginBottom:20, display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:26 }}>🏖️</span>
          <div>
            <p style={{ margin:0, color:"#805AD5", fontWeight:800, fontSize:14 }}>Hoy estás de vacaciones</p>
            <p style={{ margin:0, color: darkMode?"#64748B":"#94A3B8", fontSize:12 }}>No es necesario que fiches.</p>
          </div>
        </div>
      )}
      <div style={{ background: darkMode?"#111827":"#FFFFFF", border:`1px solid ${fichajeActivo?"#38A16944":darkMode?"#1E293B":"#E2E8F0"}`, borderRadius:14, padding:24, marginBottom:20, textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:12 }}>{fichajeActivo?"🟢":"🔴"}</div>
        <p style={{ margin:"0 0 6px", color: fichajeActivo?"#38A169":"#E53E3E", fontSize:20, fontWeight:900 }}>
          {fichajeActivo ? "Trabajando" : "Sin fichar"}
        </p>
        {fichajeActivo && (
          <p style={{ margin:"0 0 16px", color: darkMode?"#64748B":"#475569", fontSize:13 }}>
            Desde las {new Date(fichajeActivo.entrada).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})} · {durStr(duracionMs)}
          </p>
        )}
        <button onClick={fichajeActivo ? ficharSalida : ficharEntrada}
          style={{ background: fichajeActivo?"#E53E3E":"#38A169", border:"none", borderRadius:10, padding:"14px 36px", color:"#fff", fontSize:15, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
          {fichajeActivo ? "🔴 Registrar salida" : "🟢 Registrar entrada"}
        </button>
      </div>
      <h3 style={{ margin:"0 0 12px", color: darkMode?"#94A3B8":"#475569", fontSize:13, fontWeight:700, textTransform:"uppercase" }}>Registros de hoy</h3>
      {fichajesHoy.length === 0
        ? <p style={{ color: darkMode?"#334155":"#94A3B8", fontSize:13 }}>Sin registros hoy</p>
        : fichajesHoy.map(f => {
            const dur = f.salida ? new Date(f.salida)-new Date(f.entrada) : null;
            return (
              <div key={f.id} style={{ background: darkMode?"#111827":"#FFFFFF", border:`1px solid ${darkMode?"#1E293B":"#E2E8F0"}`, borderRadius:10, padding:"12px 16px", marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <p style={{ margin:0, color: darkMode?"#E2E8F0":"#0F172A", fontSize:13, fontWeight:700 }}>
                  {new Date(f.entrada).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})}
                  {f.salida && <> → {new Date(f.salida).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})}</>}
                  {!f.salida && <span style={{ color:"#38A169", marginLeft:8, fontSize:11 }}>● En progreso</span>}
                </p>
                {dur && <span style={{ color: darkMode?"#64748B":"#475569", fontSize:12, fontWeight:700 }}>{durStr(dur)}</span>}
              </div>
            );
          })
      }
    </div>
  );
}

function SeccionPerfil({ darkMode, usuarioId, usuario, pins, onCambiarPin, empColor, EMPRESAS }) {
  const [pinActual,  setPinActual]  = useState("");
  const [pinNuevo,   setPinNuevo]   = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [msgPin,     setMsgPin]     = useState(null);
  const [guardando,  setGuardando]  = useState(false);

  const guardarPin = () => {
    if (pins[usuarioId] !== pinActual)         { setMsgPin({ ok:false, txt:"El PIN actual no es correcto." }); return; }
    if (pinNuevo.length !== 4 || !/^\d+$/.test(pinNuevo)) { setMsgPin({ ok:false, txt:"El nuevo PIN debe tener 4 dígitos." }); return; }
    if (pinNuevo !== pinConfirm)               { setMsgPin({ ok:false, txt:"Los PINs no coinciden." }); return; }
    if (pinNuevo === pinActual)                { setMsgPin({ ok:false, txt:"El nuevo PIN debe ser distinto al actual." }); return; }
    setGuardando(true);
    onCambiarPin(usuarioId, pinNuevo)
      .then(() => {
        setMsgPin({ ok:true, txt:"✅ PIN actualizado. Ya puedes usarlo para entrar desde cualquier dispositivo o navegador." });
        setPinActual(""); setPinNuevo(""); setPinConfirm("");
      })
      .catch(() => setMsgPin({ ok:false, txt:"No se pudo guardar el PIN. Revisa tu conexión e inténtalo de nuevo." }))
      .finally(() => setGuardando(false));
  };

  const inp2 = { width:"100%", padding:"9px 12px", background: darkMode?"#1A2235":"#F8FAFC", border:`1px solid ${darkMode?"#2E3A55":"#CBD5E1"}`, borderRadius:8, color: darkMode?"#E2E8F0":"#0F172A", fontSize:13, fontFamily:"inherit", boxSizing:"border-box" };
  const lb   = { display:"block", color: darkMode?"#64748B":"#475569", fontSize:11, fontWeight:700, textTransform:"uppercase", marginBottom:5 };

  return (
    <div style={{ maxWidth:500 }}>
      <h2 style={{ margin:"0 0 4px", color: darkMode?"#E2E8F0":"#0F172A", fontWeight:800, fontSize:18 }}>👤 Mi Perfil</h2>
      <p style={{ margin:"0 0 28px", color: darkMode?"#475569":"#64748B", fontSize:13 }}>Información de tu cuenta</p>
      <div style={{ background: darkMode?"#111827":"#FFFFFF", border:`1px solid ${darkMode?"#1E293B":"#E2E8F0"}`, borderRadius:14, padding:24, marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:20 }}>
          <div style={{ width:56, height:56, borderRadius:"50%", background: empColor+"44", border:`3px solid ${empColor}`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, color:"#fff", fontSize:20 }}>
            {usuario?.nombre?.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()||"U"}
          </div>
          <div>
            <p style={{ margin:"0 0 4px", color: darkMode?"#E2E8F0":"#0F172A", fontSize:18, fontWeight:800 }}>{usuario?.nombre}</p>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <span style={{ background: empColor+"33", color: empColor, borderRadius:5, padding:"2px 10px", fontSize:11, fontWeight:700 }}>{usuario?.rol === "director" ? "DIRECTOR GENERAL" : usuario?.rol === "ceo" ? "CEO" : usuario?.rol?.toUpperCase()}</span>
              <span style={{ background: darkMode?"#1E293B":"#F1F5F9", color: darkMode?"#94A3B8":"#475569", borderRadius:5, padding:"2px 10px", fontSize:11 }}>{EMPRESAS.find(e=>e.id===usuario?.empresaId)?.nombre}</span>
            </div>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {[["ID de usuario", usuario?.id],["Empresa", EMPRESAS.find(e=>e.id===usuario?.empresaId)?.nombre],["Rol", usuario?.rol],["Estado","Activo"]].map(([l,v]) => (
            <div key={l} style={{ background: darkMode?"#0F172A":"#F8FAFC", borderRadius:8, padding:"10px 14px" }}>
              <p style={{ margin:"0 0 3px", color: darkMode?"#475569":"#94A3B8", fontSize:10, fontWeight:700, textTransform:"uppercase" }}>{l}</p>
              <p style={{ margin:0, color: darkMode?"#E2E8F0":"#0F172A", fontSize:13, fontWeight:600 }}>{v}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: darkMode?"#111827":"#FFFFFF", border:`1px solid ${darkMode?"#1E293B":"#E2E8F0"}`, borderRadius:14, padding:24 }}>
        <h3 style={{ margin:"0 0 16px", color: darkMode?"#E2E8F0":"#0F172A", fontSize:15, fontWeight:800 }}>🔑 Cambiar PIN</h3>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div><label style={lb}>PIN actual</label><input type="password" maxLength={4} style={inp2} value={pinActual} onChange={e=>setPinActual(e.target.value)} placeholder="••••" /></div>
          <div><label style={lb}>Nuevo PIN (4 dígitos)</label><input type="password" maxLength={4} style={inp2} value={pinNuevo} onChange={e=>setPinNuevo(e.target.value)} placeholder="••••" /></div>
          <div><label style={lb}>Confirmar nuevo PIN</label><input type="password" maxLength={4} style={inp2} value={pinConfirm} onChange={e=>setPinConfirm(e.target.value)} placeholder="••••" /></div>
          {msgPin && <p style={{ margin:0, color: msgPin.ok?"#38A169":"#E53E3E", fontSize:12, fontWeight:700 }}>{msgPin.txt}</p>}
          <button onClick={guardarPin} disabled={guardando} style={{ background: empColor, border:"none", borderRadius:8, padding:"10px", color:"#fff", fontSize:13, fontWeight:700, cursor: guardando ? "default" : "pointer", opacity: guardando ? 0.6 : 1, fontFamily:"inherit" }}>{guardando ? "Guardando…" : "Guardar PIN"}</button>
        </div>
      </div>
    </div>
  );
}

function ModalSubirNomina({ darkMode, onClose, onSubir, empColor }) {
  const [usuarioDestId, setUsuarioDestId] = useState(USUARIOS[0]?.id ?? null);
  const [mes,           setMes]           = useState(new Date().getMonth() + 1);
  const [anio,          setAnio]          = useState(new Date().getFullYear());
  const [archivo,       setArchivo]       = useState(null);
  const [cargando,      setCargando]      = useState(false);
  const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.type !== "application/pdf") { alert("Solo se permiten archivos PDF."); return; }
    if (f.size > MAX_ARCHIVO_BYTES)  { alert("El archivo no puede superar los 700 KB."); return; }
    setCargando(true);
    const r = new FileReader();
    r.onload  = () => { setArchivo({ nombre: f.name, dataUrl: r.result }); setCargando(false); };
    r.onerror = () => { alert("Error al leer el archivo."); setCargando(false); };
    r.readAsDataURL(f);
  };

  const subir = async () => {
    if (!archivo || !usuarioDestId) return;
    await onSubir({ usuarioDestinoId: usuarioDestId, mes, anio, nombre: archivo.nombre, dataUrl: archivo.dataUrl });
    onClose();
  };

  const overlay = { position:"fixed", inset:0, background:"#00000088", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16 };
  const box     = { background: darkMode?"#111827":"#FFFFFF", borderRadius:14, width:"100%", maxWidth:460, padding:24, boxShadow:"0 24px 60px #0008" };
  const inp     = { width:"100%", padding:"9px 12px", background: darkMode?"#1A2235":"#F8FAFC", border:`1px solid ${darkMode?"#2E3A55":"#CBD5E1"}`, borderRadius:8, color: darkMode?"#E2E8F0":"#0F172A", fontSize:13, fontFamily:"inherit", boxSizing:"border-box" };
  const lb      = { display:"block", color: darkMode?"#64748B":"#475569", fontSize:11, fontWeight:700, textTransform:"uppercase", marginBottom:5 };

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={box}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h3 style={{ margin:0, color: darkMode?"#E2E8F0":"#0F172A", fontSize:16, fontWeight:800 }}>💰 Subir nómina</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", color: darkMode?"#475569":"#64748B", cursor:"pointer", fontSize:20 }}>×</button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={lb}>Empleado</label>
            <select style={inp} value={usuarioDestId} onChange={e => setUsuarioDestId(Number(e.target.value))}>
              {USUARIOS.map(u => <option key={u.id} value={u.id}>{u.nombre} — {EMPRESAS.find(emp=>emp.id===u.empresaId)?.nombre}</option>)}
            </select>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div>
              <label style={lb}>Mes</label>
              <select style={inp} value={mes} onChange={e => setMes(Number(e.target.value))}>
                {["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"].map((m,i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={lb}>Año</label>
              <input type="number" style={inp} value={anio} onChange={e => setAnio(Number(e.target.value))} min={2020} max={2035} />
            </div>
          </div>
          <div>
            <label style={lb}>📎 Archivo PDF (máx. 10 MB)</label>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <label style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 14px", background: darkMode?"#1A2235":"#F8FAFC", border:`1px solid ${darkMode?"#2E3A55":"#CBD5E1"}`, borderRadius:8, cursor:"pointer", fontSize:12, color: darkMode?"#94A3B8":"#475569" }}>
                {cargando ? "⏳ Cargando..." : archivo ? "🔄 Cambiar PDF" : "📄 Seleccionar PDF"}
                <input type="file" accept="application/pdf" onChange={handleFile} style={{ display:"none" }} />
              </label>
              {archivo && (
                <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 12px", background: darkMode?"#1A223588":"#EFF6FF", border:`1px solid ${darkMode?"#2E3A5588":"#BFDBFE"}`, borderRadius:8, flex:1 }}>
                  <span style={{ fontSize:14 }}>📄</span>
                  <span style={{ color: darkMode?"#93C5FD":"#1D4ED8", fontSize:12, fontWeight:600, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{archivo.nombre}</span>
                  <button onClick={() => setArchivo(null)} style={{ background:"none", border:"none", color: darkMode?"#475569":"#94A3B8", cursor:"pointer", fontSize:14, padding:0 }}>×</button>
                </div>
              )}
            </div>
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:4 }}>
            <button onClick={onClose} style={{ padding:"9px 20px", background:"transparent", border:`1px solid ${darkMode?"#2E3A55":"#CBD5E1"}`, borderRadius:8, color: darkMode?"#64748B":"#475569", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>Cancelar</button>
            <button onClick={subir} disabled={!archivo || cargando}
              style={{ padding:"9px 20px", background: archivo&&!cargando ? empColor : empColor+"55", border:"none", borderRadius:8, color:"#fff", fontSize:13, fontWeight:700, cursor: archivo&&!cargando?"pointer":"default", fontFamily:"inherit" }}>
              ⬆️ Subir nómina
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [tickets,       setTickets]    = useState([]);
  const [usuarioId,     setUsuarioId]  = useState(() => {
    try { const id = sessionStorage.getItem("grupo_usuario_id"); return id ? Number(id) : null; } catch { return null; }
  });

  // ── Espera a que la sesión (anónima o real) esté confirmada antes de dejar
  // que cualquier listener de Firestore se suscriba. Sin esto, en el primer
  // acceso (sin sesión aún en caché), los listeners se montaban antes de que
  // signInAnonymously terminase, Firestore los rechazaba por falta de permisos,
  // y ya no se recuperaban solos aunque la sesión se estableciera un instante
  // después — de ahí que hiciera falta refrescar la página para que funcionara.
  const [authReady, setAuthReady] = useState(!!auth.currentUser);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => { if (user) setAuthReady(true); });
    return () => unsub();
  }, []);

  // Los PIN que el usuario cambia se guardan en Firestore (colección "pins")
  // para que el cambio se aplique en cualquier dispositivo/navegador donde
  // inicie sesión, no solo en el que lo cambió. Si un usuario NO tiene entrada
  // en esta colección, significa que sigue con el PIN por defecto (1234) y
  // aún no ha pasado por el cambio obligatorio del primer acceso.
  const [pinsCambiados, setPinsCambiados] = useState({}); // { userId: "nuevoPin" } — override sobre PINS_DEFAULT
  useEffect(() => {
    if (!authReady) return;
    const unsub = onSnapshot(collection(db, "pins"), snap => {
      const m = {};
      snap.docs.forEach(d => { m[Number(d.id)] = d.data().pin; });
      setPinsCambiados(m);
    }, () => {});
    return () => unsub();
  }, [authReady]);
  const [loginUsuarioId, setLoginUsuarioId] = useState("");
  const [loginPin,       setLoginPin]       = useState("");
  const [loginError,     setLoginError]     = useState("");
  const [logueado,       setLogueado]       = useState(() => {
    try { return sessionStorage.getItem("grupo_logueado") === "1"; } catch { return false; }
  });
  const [notifs,        setNotifs]     = useState([]);
  const [verNotifs,     setVerNotifs]  = useState(false);
  const [comunicados,     setComunicados]    = useState([]);
  const [verComunicados,  setVerComunicados]  = useState(false);
  const [modalComun,      setModalComun]      = useState(false);
  const [comunicadoEditar,setComunicadoEditar] = useState(null);
  const [darkMode, setDarkMode] = useState(getDM);
  const toggleTheme = () => setDarkMode(d => {
    const next = !d;
    __darkMode = next;
    // "inp" y "labelS" se calcularon una sola vez al cargar la página; los
    // mutamos aquí mismo para que los formularios que los usan (crear ticket,
    // comunicados, etc.) también cambien de color al alternar el tema.
    Object.assign(inp, { background: next ? "#1A2235" : "#F8FAFC", border: `1px solid ${next ? "#2E3A55" : "#CBD5E1"}`, color: next ? "#E2E8F0" : "#0F172A" });
    Object.assign(labelS, { color: next ? "#64748B" : "#475569" });
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
    return next;
  });
  useEffect(() => { __darkMode = darkMode; }, [darkMode]);

  // ── Firebase: config (categorías, estados) en tiempo real ──
  const [, forceUpdate] = useState(0);
  // Callbacks para propagar cambios del admin a toda la app en tiempo real
  const [configVersion, setConfigVersion] = useState(0);
  useEffect(() => {
    if (!authReady) return;
    const unsub = onSnapshot(collection(db, "config"), (snapshot) => {
      let changed = false;
      snapshot.docs.forEach(d => {
        try {
          const val = JSON.parse(d.data().value);
          if (d.id === "categorias" && Array.isArray(val) && val.length > 0) {
            CATEGORIAS.length = 0; val.forEach(v => CATEGORIAS.push(v)); changed = true;
          }
          if (d.id === "estados" && Array.isArray(val) && val.length > 0) {
            ESTADOS.length = 0; val.forEach(v => ESTADOS.push(v)); changed = true;
          }
          // EMPRESAS y USUARIOS: siempre usar los del código (no sobrescribir desde Firestore)
          // Solo sincronizamos categorías y estados desde Firestore
        } catch {}
      });
      // Incrementar configVersion fuerza re-render en App y re-inicialización del modal
      if (changed) { forceUpdate(n => n + 1); setConfigVersion(v => v + 1); }
    });
    return () => unsub();
  }, [authReady]);
  const [modalAdmin,    setModalAdmin] = useState(false);
  const [modalCrear,    setModalCrear] = useState(false);
  const [modalMisTickets, setModalMisTickets] = useState(false);
  const [misTicketsPersonales, setMisTicketsPersonales] = useState([]);
  const [detalleMiTicket, setDetalleMiTicket] = useState(null);
  const [detalle,       setDetalle]    = useState(null);
  const [filtros,       setFiltros]    = useState({ estado: "kpi_total", empresa: "todas", buscar: "" });
  const [vista,         setVista]      = useState("mis");
  const [seccion,       setSeccion]    = useState("tickets");
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    // En móvil (< 900px) el sidebar empieza cerrado
    if (typeof window !== 'undefined') return window.innerWidth > 900;
    return true;
  });
  // ── Fichaje ──
  const [fichajes,      setFichajes]   = useState([]);
  const [fichajeActivo, setFichajeActivo] = useState(null); // { id, entrada }
  // ── Nóminas ──
  const [nominas,       setNominas]    = useState([]);
  const [modalNomina,   setModalNomina] = useState(false);  // solo admin/director
  const [subHistorial,  setSubHistorial] = useState("completados");
  const [ticketsExpanded, setTicketsExpanded] = useState(true);
  const [rrhhExpanded,    setRrhhExpanded]    = useState(true);

  // ── Permisos por módulo/nivel (Fase 2: el menú y las secciones leen de aquí) ──
  const [permisos, setPermisos] = useState(buildPermisosDefault);
  useEffect(() => {
    if (!authReady) return;
    const unsub = onSnapshot(collection(db, "permisos"), snap => {
      const fromDb = {};
      snap.docs.forEach(d => { fromDb[d.id] = d.data(); });
      const merged = {};
      MODULOS_PERMISOS.forEach(m => {
        merged[m.id] = {};
        m.niveles.forEach(nv => { merged[m.id][nv] = Array.isArray(fromDb[m.id]?.[nv]) ? fromDb[m.id][nv] : (PERMISOS_DEFAULT[m.id]?.[nv] || []); });
      });
      setPermisos(merged);
    }, () => {});
    return () => unsub();
  }, [authReady]);
  // Helper: ¿el usuario actual tiene al menos 'nivel' en 'modulo'?
  const can = (modulo, nivel = "visualizacion") => tienePermiso(permisos, usuarioId, modulo, nivel);

  // ── Tickets personales: privados por usuario (con migración de los antiguos) ──
  const keyMisTickets = uid => `mis_tickets_personales_${uid}`;
  useEffect(() => {
    if (usuarioId == null) { setMisTicketsPersonales([]); return; }
    try {
      const propios = localStorage.getItem(keyMisTickets(usuarioId));
      if (propios !== null) { setMisTicketsPersonales(JSON.parse(propios) || []); return; }
      // Migración: si existen tickets del formato antiguo (compartidos), se
      // asignan a este usuario la primera vez que entra, para no perder nada.
      const antiguos = localStorage.getItem("mis_tickets_personales");
      if (antiguos) {
        const lista = JSON.parse(antiguos) || [];
        localStorage.setItem(keyMisTickets(usuarioId), JSON.stringify(lista));
        localStorage.removeItem("mis_tickets_personales");
        setMisTicketsPersonales(lista);
        return;
      }
      setMisTicketsPersonales([]);
    } catch { setMisTicketsPersonales([]); }
  }, [usuarioId]);

  // ── Usuarios: base (código) + nuevos y estado activo/inactivo (Firestore) ──
  const [estadoMap, setEstadoMap] = useState({});   // estadoUsuarios: id -> activo
  const [nuevosMap, setNuevosMap] = useState({});   // usuariosNuevos: id -> {nombre,empresaId,rol,pin}
  const [usuariosVer, setUsuariosVer] = useState(0);

  useEffect(() => {
    if (!authReady) return;
    const unsub = onSnapshot(collection(db, "estadoUsuarios"), snap => {
      const m = {}; snap.docs.forEach(d => { m[d.id] = d.data().activo; });
      setEstadoMap(m);
    }, () => {});
    return () => unsub();
  }, [authReady]);
  useEffect(() => {
    if (!authReady) return;
    const unsub = onSnapshot(collection(db, "usuariosNuevos"), snap => {
      const m = {}; snap.docs.forEach(d => { m[d.id] = { id: Number(d.id), ...d.data() }; });
      setNuevosMap(m);
    }, () => {});
    return () => unsub();
  }, [authReady]);
  // Reconstruir la lista global USUARIOS cada vez que cambien base/nuevos/estado
  useEffect(() => {
    const final = USUARIOS_BASE.map(u => ({ ...u }));
    const pinsNuevos = {};
    Object.values(nuevosMap).forEach(nv => {
      if (!final.some(u => u.id === nv.id)) {
        final.push({ id: nv.id, nombre: nv.nombre, empresaId: Number(nv.empresaId), rol: nv.rol || "trabajador" });
        if (nv.pin) { PINS_DEFAULT[nv.id] = nv.pin; pinsNuevos[nv.id] = nv.pin; }
      }
    });
    final.forEach(u => { u.activo = (String(u.id) in estadoMap) ? estadoMap[String(u.id)] !== false : true; });
    USUARIOS.length = 0;
    USUARIOS.push(...final);
    setUsuariosVer(v => v + 1);
  }, [estadoMap, nuevosMap]);

  // PIN efectivo de cada usuario: el que haya guardado en Firestore (pinsCambiados)
  // tiene prioridad; si nunca lo cambió, sigue siendo el PIN inicial (1234, o el
  // asignado al crear el usuario). Que un usuario NO tenga entrada en pinsCambiados
  // es justo la señal que usamos para forzar el cambio en el primer acceso.
  const pins = { ...PINS_DEFAULT, ...pinsCambiados };

  // Cambiar el PIN propio: se guarda en Firestore, así vale para cualquier dispositivo/navegador
  const cambiarPin = (uid, nuevoPin) =>
    setDoc(doc(db, "pins", String(uid)), { pin: nuevoPin, actualizado: new Date().toISOString() });

  // ── Mis vacaciones aprobadas (para reflejarlas en el fichaje) ──
  const [misVacaciones, setMisVacaciones] = useState([]);
  useEffect(() => {
    if (usuarioId == null || !authReady) return;
    const unsub = onSnapshot(collection(db, "solicitudesRRHH"), snap => {
      setMisVacaciones(snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(s => s.tipo === "vacaciones" && s.estado === "aprobada" && s.usuarioId === usuarioId)
        .map(s => ({ fechaInicio: s.fechaInicio, fechaFin: s.fechaFin })));
    }, () => {});
    return () => unsub();
  }, [usuarioId, authReady]);


  // ── Firebase: tickets en tiempo real ──
  useEffect(() => {
    if (!authReady) return;
    const unsub = onSnapshot(
      collection(db, "tickets"),
      (snapshot) => {
        const data = snapshot.docs.map(d => ticketFromFirestore(d.data()));
        setTickets(data.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)));
      },
      (err) => console.error("Firebase tickets error:", err)
    );
    return () => unsub();
  }, [authReady]);

  // ── Firebase: comunicados en tiempo real ──
  useEffect(() => {
    if (!authReady) return;
    // Calcular empresaId directamente desde USUARIOS para no depender de 'usuario'
    // que se define más abajo en el componente
    const miEmpId = (USUARIOS.find(u => u.id === usuarioId))?.empresaId ?? null;
    const miId    = usuarioId;

    const unsub = onSnapshot(collection(db, "comunicados"), snap => {
      const ahora   = new Date();
      const activos = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(c => {
          // Caducidad
          if (c.fechaCaducidad && new Date(c.fechaCaducidad) < ahora) return false;
          // Destinatarios
          const dest = c.destinatarios;
          if (!dest || dest.tipo === "todos") return true;
          if (dest.tipo === "empresas") return (dest.empresaIds || []).includes(miEmpId);
          if (dest.tipo === "usuarios") return (dest.usuarioIds || []).includes(miId);
          return true;
        })
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setComunicados(activos);
    });
    return () => unsub();
  }, [usuarioId, authReady]);

  // ── Firebase: fichajes en tiempo real ──
  useEffect(() => {
    if (!usuarioId || !authReady) return;
    const unsub = onSnapshot(collection(db, "fichajes"), snap => {
      const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Auto-desfichaje a las 15:00 (los míos que sigan abiertos)
      todos.forEach(f => {
        if (f.usuarioId === usuarioId && !f.salida) {
          const sal = salidaAutomatica(f);
          if (sal) updateDoc(doc(db, "fichajes", f.id), { salida: sal }).catch(() => {});
        }
      });
      setFichajes(todos.filter(f => f.usuarioId === usuarioId));
      // Solo sigue "activo" un fichaje abierto que aún no ha llegado a su cierre (15:00)
      const abierto = todos.find(f => f.usuarioId === usuarioId && !f.salida && salidaAutomatica(f) === null);
      setFichajeActivo(abierto || null);
    });
    return () => unsub();
  }, [usuarioId, authReady]);

  const usuario  = USUARIOS.find(u => u.id === usuarioId) || null;

  const esEncargado  = usuario?.rol === "encargado";
  const esTrabajador = usuario?.rol === "trabajador";
  const esDirCeo     = ["director","ceo"].includes(usuario?.rol);
  const empresa  = EMPRESAS.find(e => e.id === usuario?.empresaId);
  const empColor = ["director","ceo"].includes(usuario?.rol) ? "#94A3B8" : (empresa?.color || "#E53E3E");
  const inpF     = { fontFamily: "inherit", fontSize: 12, background: darkMode ? "#0D1424" : "#FFFFFF", border: `1px solid ${darkMode ? "#1E293B" : "#E2E8F0"}`, borderRadius: 6, padding: "7px 11px", color: darkMode ? "#E2E8F0" : "#0F172A", outline: "none", width: "100%", boxSizing: "border-box" };

  // ── Firebase: nóminas en tiempo real ──
  // Sección "Nóminas" = solo visualización: cada usuario ve ÚNICAMENTE las suyas
  // (protección de datos). La gestión de todas vive en RRHH → Gestión de Nóminas.
  useEffect(() => {
    if (!usuarioId || !authReady) return;
    const unsub = onSnapshot(collection(db, "nominas"), snap => {
      const todas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setNominas(todas.filter(n => n.usuarioId === usuarioId));
    });
    return () => unsub();
  }, [usuarioId, usuario?.rol, authReady]);

  // ── Firebase: notificaciones en tiempo real ──
  useEffect(() => {
    if (!authReady) return;
    const unsub = onSnapshot(
      collection(db, "notificaciones"),
      (snapshot) => { setNotifs(snapshot.docs.map(d => d.data())); },
      (err) => console.error("Firebase notifs error:", err)
    );
    return () => unsub();
  }, [authReady]);


  // Tickets que "pertenecen" al usuario según su rol

  const ticketsMisRol = tickets.filter(t => {
    if (!usuario || ["director","ceo"].includes(usuario.rol)) return true;
    const eds   = t.empresasDestino || [];
    const asigs = Object.values(t.asignacionesPorEmpresa || {}).flat();
    if (usuario.rol === "encargado") {
      // Encargado ve: tickets donde su empresa es destino, o tickets que él creó
      return eds.includes(usuario.empresaId) || t.creadoPor === usuario.id;
    }
    // Trabajador ve: tickets donde está asignado o que él creó
    return asigs.includes(usuario.id) || t.creadoPor === usuario.id;
  });

  const ticketsFiltrados = (() => {
    // Base: todos los tickets del rol
    let base = ticketsMisRol;

    const asigsFn = t => Object.values(t.asignacionesPorEmpresa || {}).flat();
    const edsFn   = t => t.empresasDestino || [];

    // ── KPI seleccionado ──
    if (filtros.estado === "kpi_total") {
      base = base.filter(t => {
        if (["Completado","Cancelado"].includes(t.estado)) return false;
        if (!esDirCeo) return asigsFn(t).includes(usuarioId);
        return asigsFn(t).includes(usuarioId); // dir/ceo: sus tickets asignados
      });
    } else if (filtros.estado === "kpi_pendientes") {
      base = base.filter(t => t.estado === "Pendiente" && t.creadoPor === usuarioId);
    } else if (filtros.estado === "kpi_progreso") {
      base = base.filter(t => ["Asignado","En progreso"].includes(t.estado) && asigsFn(t).includes(usuarioId));
    } else if (filtros.estado === "kpi_completados") {
      base = base.filter(t => t.estado === "Completado" && (asigsFn(t).includes(usuarioId) || t.creadoPor === usuarioId));
    } else if (filtros.estado === "kpi_solicitados") {
      // Tickets que YO he creado (para seguir su estado, los haya pedido a quien sea)
      base = tickets.filter(t => t.creadoPor === usuarioId);
    } else if (filtros.estado === "kpi_sinasignar") {
      base = base.filter(t => {
        if (t.estado !== "Pendiente") return false;
        if (esDirCeo) return Object.values(t.asignacionesPorEmpresa || {}).every(a => !a.length);
        // Encargado: tickets hacia su empresa sin asignar aún en su empresa
        return edsFn(t).includes(usuario?.empresaId) &&
               !(t.asignacionesPorEmpresa?.[usuario?.empresaId]?.length > 0);
      });
    } else {
      // Vista normal — solo tickets personales (asignados o creados por el usuario)
      base = base.filter(t => !["Completado","Cancelado"].includes(t.estado));
      base = base.filter(t => {
        const asigs = Object.values(t.asignacionesPorEmpresa || {}).flat();
        return asigs.includes(usuarioId) || t.creadoPor === usuarioId;
      });
    }

    // Filtro por empresa (para director/ceo en vista global)
    if (filtros.empresa !== "todas") {
      const empId = Number(filtros.empresa);
      base = base.filter(t => edsFn(t).includes(empId) || t.empresaOrigenId === empId);
    }

    // Buscador
    if (filtros.buscar) {
      base = base.filter(t => t.titulo.toLowerCase().includes(filtros.buscar.toLowerCase()));
    }

    return base;
  })();


  const ticketsActivos     = ticketsMisRol.filter(t => !["Completado","Cancelado"].includes(t.estado));
  const ticketsCompletados = ticketsMisRol.filter(t => t.estado === "Completado");
  const ticketsCancelados  = ticketsMisRol.filter(t => t.estado === "Cancelado");

  // Tickets donde el usuario está asignado (como trabajador)
  const misAsignados = ticketsMisRol.filter(t => {
    const asigs = Object.values(t.asignacionesPorEmpresa || {}).flat();
    return asigs.includes(usuarioId);
  });
  const misPendientes  = ticketsMisRol.filter(t => t.creadoPor === usuarioId && t.estado === "Pendiente");
  const misEnProgreso  = misAsignados.filter(t => ["Asignado","En progreso"].includes(t.estado));
  const misCompletados = ticketsMisRol.filter(t => {
    if (t.estado !== "Completado") return false;
    const asigs = Object.values(t.asignacionesPorEmpresa || {}).flat();
    return asigs.includes(usuarioId) || t.creadoPor === usuarioId;
  });

  // Sin asignar: tickets pendientes hacia mi empresa sin asignar (encargado y dir/ceo)
  const sinAsignar = (esEncargado || esDirCeo) ? ticketsMisRol.filter(t => {
    if (t.estado !== "Pendiente") return false;
    const eds = t.empresasDestino || [];
    if (esDirCeo) return Object.values(t.asignacionesPorEmpresa || {}).every(a => !a.length);
    return eds.includes(usuario.empresaId) && !(t.asignacionesPorEmpresa?.[usuario.empresaId]?.length > 0);
  }) : [];

  const stats = {
    // Total: mis tickets asignados (como trabajador)
    total:       esDirCeo
      ? misAsignados.filter(t => !["Completado","Cancelado"].includes(t.estado)).length
      : esEncargado
      ? ticketsActivos.filter(t => {
          const asigs = Object.values(t.asignacionesPorEmpresa || {}).flat();
          return asigs.includes(usuarioId) || t.creadoPor === usuarioId;
        }).length
      : misAsignados.filter(t => !["Completado","Cancelado"].includes(t.estado)).length,
    pendientes:  misPendientes.length,
    enProgreso:  misEnProgreso.length,
    completados: misCompletados.length,
    sinAsignar:  sinAsignar.length,
    solicitados: tickets.filter(t => t.creadoPor === usuarioId).length,
  };

  const guardarNotifs = (nuevas) => {
    setNotifs(nuevas);
  };

  const addNotif = (notif) => {
    const nueva = { id: genId(), fecha: new Date().toISOString(), leida: false, ...notif };
    setDoc(doc(db, "notificaciones", String(nueva.id)), nueva)
      .catch(e => console.error("Error notif:", e));
  };

  const actualizarTicket = (t, ticketAnterior) => {
    const ant = ticketAnterior || tickets.find(x => x.id === t.id);
    // Actualizar UI inmediatamente (optimistic update)
    setTickets(ts => ts.map(x => x.id === t.id ? t : x));
    setDetalle(t);
    // Guardar en Firestore (serializado)
    setDoc(doc(db, "tickets", String(t.id)), ticketToFirestore(t))
      .catch(e => console.error("Error actualizando ticket:", e));
    // Generar notificaciones
    if (ant) {
      // Cambio a completado → notificar al creador
      if (t.estado === "Completado" && ant.estado !== "Completado") {
        if (t.creadoPor !== usuarioId) {
          addNotif({ usuarioDestinoId: t.creadoPor, tipo: "completado", ticketId: t.id, texto: `El ticket "${t.titulo}" ha sido completado.` });
        }
      }
      // Nuevo comentario → notificar a involucrados excepto quien comenta
      if (t.comentarios.length > ant.comentarios.length) {
        const ultimo = t.comentarios[t.comentarios.length - 1];
        const involucrados = [...new Set([t.creadoPor, ...Object.values(t.asignacionesPorEmpresa||{}).flat()])].filter(id => id !== ultimo.autorId);
        involucrados.forEach(id => addNotif({ usuarioDestinoId: id, tipo: "comentario", ticketId: t.id, texto: `Nuevo comentario en "${t.titulo}".` }));
      }
      // Nueva asignación → notificar a asignados nuevos
      const asignadosAnt = Object.values(ant.asignacionesPorEmpresa||{}).flat();
      const asignadosNuev = Object.values(t.asignacionesPorEmpresa||{}).flat();
      asignadosNuev.filter(id => !asignadosAnt.includes(id)).forEach(id => {
        if (id !== usuarioId) addNotif({ usuarioDestinoId: id, tipo: "asignacion", ticketId: t.id, texto: `Has sido asignado al ticket "${t.titulo}".` });
      });
    }
  };

  const borrarTicket = (t) => {
    setTickets(ts => ts.filter(x => x.id !== t.id));
    deleteDoc(doc(db, "tickets", String(t.id))).catch(e => console.error("Error borrando ticket:", e));
    setDetalle(null);
  };

  const crearTicket = (t) => {
    // Actualizar UI inmediatamente
    setTickets(ts => [t, ...ts]);
    // Guardar en Firestore (serializado)
    setDoc(doc(db, "tickets", String(t.id)), ticketToFirestore(t))
      .catch(e => console.error("Error creando ticket:", e));
    // Notificar a encargados de empresas destino (nunca debe romper la creación)
    try {
      (t.empresasDestino||[]).forEach(empId => {
        const enc = USUARIOS.find(u => u.empresaId === empId && u.rol === "encargado");
        // Empresa Independiente (id:0) no tiene encargado — notificar al director y CEO
        if (!enc && empId === 0) {
          USUARIOS.filter(u => ["director","ceo"].includes(u.rol)).forEach(u => {
            if (u.id !== usuarioId) addNotif({ usuarioDestinoId: u.id, tipo: "nuevo", ticketId: t.id, texto: `Nuevo ticket de empresa Independiente: "${t.titulo}"` });
          });
        }
        if (enc && enc.id !== usuarioId) addNotif({ usuarioDestinoId: enc.id, tipo: "nuevo", ticketId: t.id, texto: `Nuevo ticket para tu empresa: "${t.titulo}".` });
      });
    } catch (e) { console.error("Error notificando el ticket:", e); }
  };

  // ── Fichaje ──
  const ficharEntrada = async () => {
    const id  = `fic_${usuarioId}_${Date.now()}`;
    const now = new Date().toISOString();
    await setDoc(doc(db, "fichajes", id), { id, usuarioId, entrada: now, salida: null, fecha: now.split("T")[0] });
  };
  const ficharSalida = async () => {
    if (!fichajeActivo) return;
    await setDoc(doc(db, "fichajes", fichajeActivo.id), { ...fichajeActivo, salida: new Date().toISOString() });
  };

  // ── Nóminas ──
  const subirNomina = async ({ usuarioDestinoId, mes, anio, nombre, dataUrl }) => {
    const id = String(Date.now());
    await setDoc(doc(db, "nominas", id), { id, usuarioId: usuarioDestinoId, mes, anio, nombre, dataUrl, subidoPor: usuarioId, fecha: new Date().toISOString() });
  };
  const eliminarNomina = async (id) => {
    await deleteDoc(doc(db, "nominas", id));
  };

  const guardarTicketPersonal = (t) => {
    const nuevos = [t, ...misTicketsPersonales];
    setMisTicketsPersonales(nuevos);
    try { if (usuarioId != null) localStorage.setItem(keyMisTickets(usuarioId), JSON.stringify(nuevos)); } catch {}
    // Programar notificación si tiene alerta
    if (t.alerta && t.fechaAlerta) {
      const ms = new Date(t.fechaAlerta).getTime() - Date.now();
      if (ms > 0) {
        setTimeout(() => {
          if (Notification.permission === "granted") {
            new Notification("📝 Recordatorio: " + t.titulo, { body: t.descripcion || "Tienes un ticket personal pendiente.", icon: "/favicon.ico" });
          }
        }, ms);
      }
    }
  };

  const actualizarTicketPersonal = (t) => {
    const nuevos = misTicketsPersonales.map(x => x.id === t.id ? t : x);
    setMisTicketsPersonales(nuevos);
    try { if (usuarioId != null) localStorage.setItem(keyMisTickets(usuarioId), JSON.stringify(nuevos)); } catch {}
    if (detalleMiTicket?.id === t.id) setDetalleMiTicket(t);
  };

  const misNotifs = notifs.filter(n => n.usuarioDestinoId === usuarioId);
  const notifsNoLeidas = misNotifs.filter(n => !n.leida).length;

  const marcarLeidas = () => {
    notifs
      .filter(n => n.usuarioDestinoId === usuarioId && !n.leida)
      .forEach(n => {
        updateDoc(doc(db, "notificaciones", String(n.id)), { leida: true })
          .catch(e => console.error("Error marcando notif:", e));
      });
  };

  // Limpia todo el estado de UI del usuario anterior (evita que el siguiente
  // usuario herede su sección, filtros, detalles o modales abiertos).
  const resetUI = () => {
    setSeccion("tickets");
    setDetalle(null);
    setDetalleMiTicket(null);
    setModalMisTickets(false);
    setFiltros({ estado: "kpi_total", empresa: "todas", buscar: "" });
    setTicketsExpanded(true);
    setRrhhExpanded(true);
    setMisTicketsPersonales([]);
  };

  // Si la sección actual no está permitida para este usuario, llevarlo a la
  // primera a la que sí tenga acceso (evita pantallas en blanco).
  useEffect(() => {
    if (!logueado || usuarioId == null) return;
    const permitida = {
      tickets: can("tickets"), historial: can("tickets"),
      reportes: can("tickets", "administracion"), equipo: can("tickets", "administracion"),
      calendario: can("calendario"), comunicacion: can("comunicacion"),
      vacaciones: can("vacaciones"), proyectos: can("proyectos"),
      nominas: can("nominas"), fichaje: can("fichaje"),
      salas: can("salas"), coches: can("coches"), perfil: can("perfil"),
      permisos: usuario?.rol === "administrador",
      gestion_nominas: can("nominas", "administracion"),
      gestion_vacaciones: can("vacaciones", "administracion"),
      gestion_fichajes: can("fichaje", "administracion"),
    };
    if (permitida[seccion] === false) {
      const primera = ["tickets","calendario","comunicacion","vacaciones","proyectos","nominas","fichaje","salas","coches","perfil"].find(s => permitida[s]);
      if (primera) setSeccion(primera);
    }
  }, [logueado, usuarioId, seccion, permisos]);

  const handleLogin = () => {
    const uid = Number(loginUsuarioId);
    const pin = pins[uid];
    if (!pin) { setLoginError("Selecciona un usuario"); return; }
    if (loginPin !== pin) { setLoginError("PIN incorrecto"); return; }
    resetUI();
    setUsuarioId(uid);
    try { sessionStorage.setItem("grupo_usuario_id", String(uid)); sessionStorage.setItem("grupo_logueado", "1"); } catch {}
    setLogueado(true);
    setLoginError("");
    setLoginPin("");
  };

  const handleLogout = () => {
    setLogueado(false);
    setLoginPin("");
    setLoginUsuarioId("");
    setUsuarioId(null);
    resetUI();
    try { sessionStorage.removeItem("grupo_logueado"); sessionStorage.removeItem("grupo_usuario_id"); } catch {}
  };

  // Un usuario que todavía no ha cambiado nunca su PIN (sigue con el 1234 por
  // defecto, es decir, no tiene entrada propia en "pins") está obligado a
  // elegir uno nuevo antes de poder usar la app. Así nos aseguramos de que
  // nadie se queda para siempre con el PIN genérico, adivinable por cualquiera.
  const debeCambiarPin = logueado && usuarioId != null && pinsCambiados[usuarioId] === undefined;
  const [pinNuevoInicial,   setPinNuevoInicial]   = useState("");
  const [pinConfirmInicial, setPinConfirmInicial] = useState("");
  const [errorPinInicial,   setErrorPinInicial]   = useState("");
  const [guardandoPinInicial, setGuardandoPinInicial] = useState(false);
  const confirmarPinInicial = () => {
    setErrorPinInicial("");
    if (pinNuevoInicial.length !== 4 || !/^\d+$/.test(pinNuevoInicial)) { setErrorPinInicial("El PIN debe tener 4 dígitos."); return; }
    if (pinNuevoInicial === "1234")                                     { setErrorPinInicial("Elige un PIN distinto al 1234 por defecto."); return; }
    if (pinNuevoInicial !== pinConfirmInicial)                          { setErrorPinInicial("Los PIN no coinciden."); return; }
    setGuardandoPinInicial(true);
    cambiarPin(usuarioId, pinNuevoInicial)
      .then(() => { setPinNuevoInicial(""); setPinConfirmInicial(""); })
      .catch(() => setErrorPinInicial("No se pudo guardar el PIN. Revisa tu conexión e inténtalo de nuevo."))
      .finally(() => setGuardandoPinInicial(false));
  };

  // ── PANTALLA LOGIN ──
  if (!logueado || usuarioId === null || !usuario) {
    return (
      <div style={{ minHeight: "100vh", background: darkMode ? "#0A0F1C" : "#F1F5F9", fontFamily: "'DM Sans','Segoe UI',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <div className="login-box" style={{ background: darkMode ? "#111827" : "#FFFFFF", border: `1px solid ${darkMode ? "#1E293B" : "#E2E8F0"}`, borderRadius: 16, padding: 36, width: "100%", maxWidth: 380, boxShadow: "0 24px 80px #0008" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#0F172A", borderRadius: 14, padding: "18px 28px", marginBottom: 12 }}>
              <img src={LOGO_GRULLA_FULL} alt="Grulla" style={{ height: 44, display: "block" }} />
            </div>
            <p style={{ margin: 0, color: darkMode ? "#475569" : "#64748B", fontSize: 13 }}>Sistema de gestión interempresarial</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ color: darkMode ? "#64748B" : "#475569", fontSize: 11, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Usuario</label>
              <select style={{ width: "100%", fontFamily: "inherit", fontSize: 13, background: darkMode ? "#0D1424" : "#FFFFFF", border: `1px solid ${darkMode ? "#1E293B" : "#E2E8F0"}`, borderRadius: 8, padding: "10px 12px", color: darkMode ? "#E2E8F0" : "#0F172A", outline: "none" }}
                value={loginUsuarioId} onChange={e => { setLoginUsuarioId(e.target.value); setLoginError(""); }}>
                <option value="">Selecciona tu usuario...</option>
                {EMPRESAS.map(emp => (
                  <optgroup key={emp.id} label={emp.nombre}>
                    {USUARIOS.filter(u => u.empresaId === emp.id && u.activo !== false).map(u => {
                      const rolLabel = u.rol === "director" ? " · Director General" : u.rol === "ceo" ? " · CEO" : u.rol === "encargado" ? " · Encargado" : u.rol === "administrador" ? " · Admin" : u.rol === "rrhh" ? " · RRHH" : "";
                      return <option key={u.id} value={u.id}>{u.nombre}{rolLabel}</option>;
                    })}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label style={{ color: darkMode ? "#64748B" : "#475569", fontSize: 11, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 6 }}>PIN (4 dígitos)</label>
              <input type="password" maxLength={4} inputMode="numeric"
                style={{ width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 20, letterSpacing: 8, textAlign: "center", background: darkMode ? "#0D1424" : "#FFFFFF", border: `1px solid ${loginError ? "#E53E3E" : darkMode ? "#1E293B" : "#E2E8F0"}`, borderRadius: 8, padding: "10px 12px", color: darkMode ? "#E2E8F0" : "#0F172A", outline: "none" }}
                value={loginPin} onChange={e => { setLoginPin(e.target.value.replace(/\D/,"")); setLoginError(""); }}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                placeholder="• • • •" />
              {loginError && <p style={{ margin: "6px 0 0", color: "#E53E3E", fontSize: 12 }}>{loginError}</p>}
            </div>
            <button onClick={handleLogin}
              style={{ fontFamily: "inherit", fontWeight: 800, fontSize: 14, background: "#3182CE", color: "#fff", border: "none", borderRadius: 8, padding: "12px", cursor: "pointer", marginTop: 4 }}>
              Entrar
            </button>
          </div>
          <p style={{ textAlign: "center", color: darkMode ? "#334155" : "#94A3B8", fontSize: 11, marginTop: 20, marginBottom: 0 }}>PIN por defecto: 1234</p>
        </div>
      </div>
    );
  }

  // ── PANTALLA OBLIGATORIA: cambiar el PIN por defecto en el primer acceso ──
  if (debeCambiarPin) {
    return (
      <div style={{ minHeight: "100vh", background: darkMode ? "#0A0F1C" : "#F1F5F9", fontFamily: "'DM Sans','Segoe UI',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <div style={{ background: darkMode ? "#111827" : "#FFFFFF", border: `1px solid ${darkMode ? "#1E293B" : "#E2E8F0"}`, borderRadius: 16, padding: 36, width: "100%", maxWidth: 380, boxShadow: "0 24px 80px #0008" }}>
          <h2 style={{ margin: "0 0 6px", color: darkMode ? "#E2E8F0" : "#0F172A", fontSize: 18, fontWeight: 800 }}>🔒 Elige tu PIN</h2>
          <p style={{ margin: "0 0 24px", color: darkMode ? "#475569" : "#64748B", fontSize: 13 }}>
            Es tu primer acceso, {usuario?.nombre}. Por seguridad, tienes que cambiar el PIN por defecto (1234) por uno propio antes de continuar.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ color: darkMode ? "#64748B" : "#475569", fontSize: 11, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Nuevo PIN (4 dígitos)</label>
              <input type="password" maxLength={4} inputMode="numeric"
                style={{ width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 20, letterSpacing: 8, textAlign: "center", background: darkMode ? "#0D1424" : "#FFFFFF", border: `1px solid ${darkMode ? "#1E293B" : "#E2E8F0"}`, borderRadius: 8, padding: "10px 12px", color: darkMode ? "#E2E8F0" : "#0F172A", outline: "none" }}
                value={pinNuevoInicial} onChange={e => { setPinNuevoInicial(e.target.value.replace(/\D/,"")); setErrorPinInicial(""); }} placeholder="• • • •" />
            </div>
            <div>
              <label style={{ color: darkMode ? "#64748B" : "#475569", fontSize: 11, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Confirmar PIN</label>
              <input type="password" maxLength={4} inputMode="numeric"
                style={{ width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 20, letterSpacing: 8, textAlign: "center", background: darkMode ? "#0D1424" : "#FFFFFF", border: `1px solid ${errorPinInicial ? "#E53E3E" : darkMode ? "#1E293B" : "#E2E8F0"}`, borderRadius: 8, padding: "10px 12px", color: darkMode ? "#E2E8F0" : "#0F172A", outline: "none" }}
                value={pinConfirmInicial} onChange={e => { setPinConfirmInicial(e.target.value.replace(/\D/,"")); setErrorPinInicial(""); }}
                onKeyDown={e => e.key === "Enter" && confirmarPinInicial()} placeholder="• • • •" />
              {errorPinInicial && <p style={{ margin: "6px 0 0", color: "#E53E3E", fontSize: 12 }}>{errorPinInicial}</p>}
            </div>
            <button onClick={confirmarPinInicial} disabled={guardandoPinInicial}
              style={{ fontFamily: "inherit", fontWeight: 800, fontSize: 14, background: "#3182CE", color: "#fff", border: "none", borderRadius: 8, padding: "12px", cursor: guardandoPinInicial ? "default" : "pointer", opacity: guardandoPinInicial ? 0.7 : 1, marginTop: 4 }}>
              {guardandoPinInicial ? "Guardando…" : "Guardar y continuar"}
            </button>
            <button onClick={handleLogout} style={{ fontFamily: "inherit", fontSize: 12, background: "transparent", color: darkMode ? "#64748B" : "#94A3B8", border: "none", cursor: "pointer" }}>Cerrar sesión</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: darkMode ? "#0A0F1C" : "#F1F5F9", fontFamily: "'DM Sans','Segoe UI',sans-serif", color: darkMode ? "#E2E8F0" : "#0F172A", transition: "background .2s, color .2s" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes parpadeo {
          0%, 100% { opacity: 1; border-color: #E53E3E; box-shadow: 0 0 0 0px #E53E3E44; }
          50%       { opacity: 0.72; border-color: #E53E3EBB; box-shadow: 0 0 0 4px #E53E3E22; }
        }
        *, *::before, *::after { transition: background-color .15s, border-color .15s, color .1s; }
        html { -webkit-text-size-adjust: 100%; }
        body { margin: 0; padding: 0; }
        /* ── SIDEBAR OVERLAY (siempre en DOM, visible solo móvil) ── */
        .sidebar-overlay { display: none; position: fixed; inset: 0; background: #00000066; z-index: 199; }

        /* ── TABLET (≤ 900px): sidebar colapsado por defecto ── */
        @media (max-width: 900px) {
          .sidebar-aside {
            position: fixed !important;
            left: 0; top: 0;
            height: 100vh !important;
            z-index: 200 !important;
            transform: translateX(-100%);
            transition: transform .25s ease !important;
            width: 240px !important;
            min-width: 240px !important;
          }
          .sidebar-aside.open {
            transform: translateX(0) !important;
          }
          .sidebar-overlay { display: block; }
          .main-content { padding: 16px 18px !important; }
          .stats-grid { grid-template-columns: repeat(2,1fr) !important; gap: 10px !important; }
        }

        /* ── MÓVIL (≤ 640px) ── */
        @media (max-width: 640px) {
          .nav-logo-subtitle { display: none !important; }
          .nav-user-role { display: none !important; }
          .nav-empresa-name { display: none !important; }
          .nav-user-nombre { display: none !important; }
          .nav-user-tags { display: none !important; }
          .main-content { padding: 12px 10px !important; }
          .stats-grid { grid-template-columns: repeat(2,1fr) !important; gap: 8px !important; }
          .tickets-grid { grid-template-columns: 1fr !important; }
          .filters-row { flex-direction: column !important; align-items: stretch !important; gap: 8px !important; }
          .filters-row > * { width: 100% !important; min-width: unset !important; box-sizing: border-box; }
          .btn-nuevo { margin-left: 0 !important; width: 100% !important; }
          .btn-mis-tickets { width: 100% !important; }
          .modal-overlay { padding: 0 !important; align-items: flex-end !important; }
          .modal-box { padding: 18px 14px !important; border-radius: 16px 16px 0 0 !important; margin: 0 !important; max-width: 100% !important; width: 100% !important; max-height: 92vh; overflow-y: auto; }
          .form-grid-3 { grid-template-columns: 1fr !important; }
          .form-grid-2 { grid-template-columns: 1fr !important; }
          .login-box { padding: 24px 16px !important; margin: 16px !important; border-radius: 12px !important; }
          .banner-director { flex-direction: column !important; padding: 12px !important; }
          .historial-subtabs { width: 100% !important; }
          .historial-subtabs button { flex: 1 !important; }
          .page-header { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
          .page-header-actions { width: 100% !important; }
          .page-header-actions button { width: 100% !important; }
          .topbar-title { font-size: 14px !important; }
        }

        /* ── MÓVIL PEQUEÑO (≤ 380px) ── */
        @media (max-width: 380px) {
          .stats-grid { gap: 6px !important; }
          .main-content { padding: 10px 8px !important; }
        }
      `}</style>

      {/* NAV */}
      {/* ═══════════════════════════════════════════
          LAYOUT: SIDEBAR + CONTENIDO
      ═══════════════════════════════════════════ */}
      <div style={{ display:"flex", height:"100vh", overflow:"hidden" }}>

        {/* ── SIDEBAR ── */}
        {/* Overlay móvil para cerrar sidebar */}
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

        <aside className={`sidebar-aside${sidebarOpen ? " open" : ""}`} style={{
          width:          sidebarOpen ? 220 : 60,
          minWidth:       sidebarOpen ? 220 : 60,
          background:     darkMode ? "#111827" : "#FFFFFF",
          borderRight:   `1px solid ${darkMode ? "#1E293B" : "#E8EDF2"}`,
          display:        "flex",
          flexDirection:  "column",
          position:       "sticky",
          top:            0,
          height:         "100vh",
          overflowY:      "auto",
          overflowX:      "hidden",
          transition:     "width .25s ease",
          zIndex:         110,
          flexShrink:     0,
        }}>
          {/* Logo + toggle */}
          <div style={{ padding: sidebarOpen ? "20px 16px 12px" : "20px 10px 12px", display:"flex", alignItems:"center", justifyContent: sidebarOpen ? "space-between" : "center", borderBottom:`1px solid ${darkMode?"#1E293B":"#F0F2F5"}` }}>
            {sidebarOpen && (
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:34, height:34, borderRadius:8, background: empColor, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <img src={LOGO_GRULLA_ICON} alt="Grulla" style={{ height:22, display:"block" }} />
                </div>
                <div>
                  <p style={{ margin:0, color: darkMode?"#fff":"#1B2559", fontSize:15, fontWeight:900, lineHeight:1.2 }}>Grulla</p>
                </div>
              </div>
            )}
            <button onClick={() => setSidebarOpen(v => !v)}
              style={{ background:"none", border:"none", color: darkMode?"#94A3B8":"#A3AED0", cursor:"pointer", fontSize:18, padding:4, lineHeight:1, flexShrink:0 }}>
              {sidebarOpen ? "◀" : "▶"}
            </button>
          </div>

          {/* Avatar usuario */}
          <div style={{ padding: sidebarOpen ? "16px 16px 8px" : "16px 10px 8px", borderBottom:`1px solid ${darkMode?"#1E293B":"#F0F2F5"}` }}>
            {sidebarOpen ? (
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:38, height:38, borderRadius:"50%", background: empColor + "44", border:`2px solid ${empColor}`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:"#fff", fontSize:14, flexShrink:0 }}>
                  {usuario?.nombre?.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase() || "U"}
                </div>
                <div style={{ overflow:"hidden" }}>
                  <p style={{ margin:0, color: darkMode?"#fff":"#1B2559", fontSize:12, fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{usuario?.nombre}</p>
                  <span style={{ background: empColor + "44", color: empColor, borderRadius:4, padding:"1px 7px", fontSize:9, fontWeight:800, textTransform:"uppercase" }}>{usuario?.rol === "director" ? "Director General" : usuario?.rol === "ceo" ? "CEO" : usuario?.rol === "rrhh" ? "RRHH" : usuario?.rol}</span>
                </div>
              </div>
            ) : (
              <div style={{ width:38, height:38, borderRadius:"50%", background: empColor + "44", border:`2px solid ${empColor}`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:"#fff", fontSize:14, margin:"0 auto" }}>
                {usuario?.nombre?.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase() || "U"}
              </div>
            )}
          </div>

          {/* Menú de navegación */}
          <nav style={{ flex:1, padding:"8px 8px", display:"flex", flexDirection:"column", gap:2, overflowY:"auto" }}>

            {/* ── TICKETS con submenú ── */}
            <button onClick={() => { setTicketsExpanded(v => !v); setSeccion("tickets"); }}
              title={!sidebarOpen ? "Tickets" : ""}
              style={{ display:"flex", alignItems:"center", gap:10, padding:sidebarOpen?"10px 12px":"10px", justifyContent:sidebarOpen?"flex-start":"center", borderRadius:8, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:["tickets","historial","reportes","equipo"].includes(seccion)?700:500, background:["tickets","historial","reportes","equipo"].includes(seccion)?(darkMode?"#1E293B":"#F4F7FE"):"transparent", color:["tickets","historial","reportes","equipo"].includes(seccion)?empColor:(darkMode?"#94A3B8":"#68769F"), borderLeft:["tickets","historial","reportes","equipo"].includes(seccion)?`3px solid ${empColor}`:"3px solid transparent", transition:"all .15s", width:"100%", whiteSpace:"nowrap" }}
              onMouseEnter={e => { if(!["tickets","historial","reportes","equipo"].includes(seccion)) e.currentTarget.style.background=darkMode?"#1E293B33":"#F4F7FE88"; }}
              onMouseLeave={e => { if(!["tickets","historial","reportes","equipo"].includes(seccion)) e.currentTarget.style.background="transparent"; }}>
              <span style={{ fontSize:16, flexShrink:0 }}>🎫</span>
              {sidebarOpen && <><span style={{ flex:1 }}>Tickets</span><span style={{ fontSize:10 }}>{ticketsExpanded?"▾":"▸"}</span></>}
            </button>

            {/* Submenú Tickets */}
            {ticketsExpanded && sidebarOpen && (
              <div style={{ marginLeft:12, borderLeft:`2px solid ${darkMode?"#1E293B":"#E2E8F0"}`, paddingLeft:8, display:"flex", flexDirection:"column", gap:1 }}>
                {[
                  { id:"historial", icon:"🗂️",  label:"Historial",      show: can("tickets") },
                  { id:"reportes",  icon:"📄", label:"Reportes",        show: can("tickets","administracion") },
                  { id:"equipo",    icon:"👥", label:"Panel de equipo", show: can("tickets","administracion") },
                ].filter(i => i.show).map(item => {
                  const activo = seccion === item.id;
                  return (
                    <button key={item.id} onClick={e => { e.stopPropagation(); setSeccion(item.id); }}
                      style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px", borderRadius:7, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:12, fontWeight:activo?700:400, background:activo?(darkMode?"#1E293B":"#EEF2FF"):"transparent", color:activo?empColor:(darkMode?"#64748B":"#94A3B8"), transition:"all .15s", width:"100%" }}
                      onMouseEnter={e => { if(!activo) e.currentTarget.style.background=darkMode?"#1E293B33":"#F4F7FE"; }}
                      onMouseLeave={e => { if(!activo) e.currentTarget.style.background="transparent"; }}>
                      <span style={{ fontSize:13 }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── RRHH con submenú (nivel Administración de nóminas/vacaciones/fichaje) ── */}
            {(can("nominas","administracion") || can("vacaciones","administracion") || can("fichaje","administracion")) && (
              <>
                <button onClick={() => { setRrhhExpanded(v => !v); setSeccion("gestion_nominas"); }}
                  title={!sidebarOpen ? "RRHH" : ""}
                  style={{ display:"flex", alignItems:"center", gap:10, padding:sidebarOpen?"10px 12px":"10px", justifyContent:sidebarOpen?"flex-start":"center", borderRadius:8, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:["gestion_nominas","gestion_vacaciones","gestion_fichajes"].includes(seccion)?700:500, background:["gestion_nominas","gestion_vacaciones","gestion_fichajes"].includes(seccion)?(darkMode?"#1E293B":"#F4F7FE"):"transparent", color:["gestion_nominas","gestion_vacaciones","gestion_fichajes"].includes(seccion)?empColor:(darkMode?"#94A3B8":"#68769F"), borderLeft:["gestion_nominas","gestion_vacaciones","gestion_fichajes"].includes(seccion)?`3px solid ${empColor}`:"3px solid transparent", transition:"all .15s", width:"100%", whiteSpace:"nowrap" }}
                  onMouseEnter={e => { if(!["gestion_nominas","gestion_vacaciones","gestion_fichajes"].includes(seccion)) e.currentTarget.style.background=darkMode?"#1E293B33":"#F4F7FE88"; }}
                  onMouseLeave={e => { if(!["gestion_nominas","gestion_vacaciones","gestion_fichajes"].includes(seccion)) e.currentTarget.style.background="transparent"; }}>
                  <span style={{ fontSize:16, flexShrink:0 }}>👔</span>
                  {sidebarOpen && <><span style={{ flex:1 }}>RRHH</span><span style={{ fontSize:10 }}>{rrhhExpanded?"▾":"▸"}</span></>}
                </button>

                {rrhhExpanded && sidebarOpen && (
                  <div style={{ marginLeft:12, borderLeft:`2px solid ${darkMode?"#1E293B":"#E2E8F0"}`, paddingLeft:8, display:"flex", flexDirection:"column", gap:1 }}>
                    {[
                      { id:"gestion_nominas",    icon:"📋", label:"Gestión de Nóminas",    show: can("nominas","administracion") },
                      { id:"gestion_vacaciones", icon:"🏖️",  label:"Gestión de Vacaciones", show: can("vacaciones","administracion") },
                      { id:"gestion_fichajes",   icon:"🕐", label:"Gestión de Fichajes",   show: can("fichaje","administracion") },
                    ].filter(i => i.show).map(item => {
                      const activo = seccion === item.id;
                      return (
                        <button key={item.id} onClick={e => { e.stopPropagation(); setSeccion(item.id); }}
                          style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px", borderRadius:7, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:12, fontWeight:activo?700:400, background:activo?(darkMode?"#1E293B":"#EEF2FF"):"transparent", color:activo?empColor:(darkMode?"#64748B":"#94A3B8"), transition:"all .15s", width:"100%" }}
                          onMouseEnter={e => { if(!activo) e.currentTarget.style.background=darkMode?"#1E293B33":"#F4F7FE"; }}
                          onMouseLeave={e => { if(!activo) e.currentTarget.style.background="transparent"; }}>
                          <span style={{ fontSize:13 }}>{item.icon}</span>
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ── RESTO ── */}
            {[
              ...(can("calendario")   ? [{ id:"calendario",   icon:"📅", label:"Calendario" }] : []),
              ...(can("comunicacion") ? [{ id:"comunicacion", icon:"📣", label:"Comunicación" }] : []),
              ...(can("vacaciones")   ? [{ id:"vacaciones",   icon:"🏖️", label:"Vacaciones" }] : []),
              ...(can("proyectos")    ? [{ id:"proyectos",    icon:"📊", label:"Proyectos" }] : []),
              ...(can("nominas")      ? [{ id:"nominas", icon:"💰", label:"Nóminas" }] : []),
              ...(can("fichaje")      ? [{ id:"fichaje", icon:"🕐", label:"Fichaje", extra:fichajeActivo }] : []),
              ...(can("salas")        ? [{ id:"salas", icon:"🏛️", label:"Salas" }] : []),
              ...(can("coches")       ? [{ id:"coches", icon:"🚗", label:"Coches" }] : []),
              ...(usuario?.rol === "administrador" ? [{ id:"permisos", icon:"🔐", label:"Permisos" }] : []),
              ...(can("perfil")       ? [{ id:"perfil", icon:"👤", label:"Perfil" }] : []),
            ].map(item => {
              const activo = seccion === item.id;
              return (
                <button key={item.id} onClick={() => setSeccion(item.id)}
                  title={!sidebarOpen ? item.label : ""}
                  style={{ display:"flex", alignItems:"center", gap:10, padding:sidebarOpen?"10px 12px":"10px", justifyContent:sidebarOpen?"flex-start":"center", borderRadius:8, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:activo?700:500, background:activo?(darkMode?"#1E293B":"#F4F7FE"):"transparent", color:activo?empColor:(darkMode?"#94A3B8":"#68769F"), borderLeft:activo?`3px solid ${empColor}`:"3px solid transparent", transition:"all .15s", width:"100%", whiteSpace:"nowrap" }}
                  onMouseEnter={e => { if(!activo) e.currentTarget.style.background=darkMode?"#1E293B33":"#F4F7FE88"; }}
                  onMouseLeave={e => { if(!activo) e.currentTarget.style.background="transparent"; }}>
                  <span style={{ fontSize:16, flexShrink:0 }}>{item.icon}</span>
                  {sidebarOpen && <span style={{ flex:1 }}>{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* Acciones inferiores */}
          <div style={{ padding:"8px", borderTop:`1px solid ${darkMode?"#1E293B":"#F0F2F5"}`, display:"flex", flexDirection: sidebarOpen ? "row" : "column", gap:6, justifyContent:"center", alignItems:"center" }}>

            {/* Notificaciones */}
            <div style={{ position:"relative" }}>
              <button onClick={() => { setVerNotifs(v => !v); marcarLeidas(); }} title="Notificaciones"
                style={{ background: notifsNoLeidas > 0 ? "#1A2235" : "transparent", border: notifsNoLeidas > 0 ? "1px solid #2E3A55" : "1px solid transparent", borderRadius:8, padding:"7px 10px", cursor:"pointer", fontSize:16, position:"relative", color:darkMode?"#94A3B8":"#68769F" }}>
                🔔
                {notifsNoLeidas > 0 && <span style={{ position:"absolute", top:2, right:2, background:"#E53E3E", color:"#fff", borderRadius:"50%", width:14, height:14, fontSize:8, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center" }}>{notifsNoLeidas}</span>}
              </button>
            </div>
            {/* Tema */}
            <button onClick={toggleTheme} title={darkMode ? "Modo claro" : "Modo oscuro"}
              style={{ background:"transparent", border:"1px solid transparent", borderRadius:8, padding:"7px 10px", cursor:"pointer", fontSize:16, color:darkMode?"#94A3B8":"#68769F" }}>
              {darkMode ? "☀️" : "🌙"}
            </button>
            {/* Admin */}
            {(["director","ceo"].includes(usuario?.rol) || usuario?.rol === "administrador") && (
              <button onClick={() => setModalAdmin(true)} title="Administración"
                style={{ background:"transparent", border:"1px solid transparent", borderRadius:8, padding:"7px 10px", cursor:"pointer", fontSize:14, color:"#F6AD55" }}>⚙️</button>
            )}
            {/* Logout */}
            <button onClick={handleLogout} title="Cerrar sesión"
              style={{ background:"transparent", border:"1px solid transparent", borderRadius:8, padding:"7px 10px", cursor:"pointer", fontSize:14, color:darkMode?"#64748B":"#A3AED0" }}>🚪</button>
          </div>

          {/* Panel de comunicados eliminado — usar sección propia */}
                    {verNotifs && (
            <div style={{ position:"fixed", left: sidebarOpen ? 248 : 72, bottom:60, background: darkMode?"#111827":"#FFFFFF", border:`1px solid ${darkMode?"#1E293B":"#E2E8F0"}`, borderRadius:12, width:"min(320px,calc(100vw-80px))", maxHeight:360, overflowY:"auto", zIndex:200, boxShadow:"0 16px 40px #0008" }}>
              <div style={{ padding:"12px 16px", borderBottom:`1px solid ${darkMode?"#1E293B":"#E2E8F0"}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ color: darkMode?"#E2E8F0":"#0F172A", fontWeight:800, fontSize:13 }}>Notificaciones</span>
                <button onClick={() => setVerNotifs(false)} style={{ background:"none", border:"none", color: darkMode?"#475569":"#64748B", cursor:"pointer", fontSize:18 }}>×</button>
              </div>
              {misNotifs.length === 0
                ? <p style={{ padding:16, color: darkMode?"#475569":"#64748B", fontSize:13, margin:0 }}>Sin notificaciones</p>
                : misNotifs.slice(0,20).map(n => (
                  <div key={n.id} style={{ padding:"10px 16px", borderBottom:"1px solid #0D1424", background: n.leida ? "transparent" : darkMode?"#1A2235":"#F8FAFC" }}>
                    <p style={{ margin:"0 0 3px", color:"#CBD5E1", fontSize:12 }}>{n.texto}</p>
                    <p style={{ margin:0, color: darkMode?"#475569":"#64748B", fontSize:10 }}>{fmtFecha(n.fecha)}</p>
                  </div>
                ))
              }
            </div>
          )}
        </aside>

        {/* ── CONTENIDO PRINCIPAL ── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, background: darkMode?"#0D1424":"#F0F3FA", overflow:"hidden" }}>

          {/* Topbar */}
          <div style={{ background: darkMode?"#111827":"#FFFFFF", borderBottom:`1px solid ${darkMode?"#1E293B":"#E8EDF2"}`, padding:"0 20px", height:60, display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
            {/* Hamburguesa móvil */}
            <button onClick={() => setSidebarOpen(v => !v)}
              style={{ background:"none", border:"none", cursor:"pointer", color: darkMode?"#94A3B8":"#A3AED0", fontSize:22, padding:"4px", display:"flex", alignItems:"center", flexShrink:0 }}>
              ☰
            </button>

            {/* Título sección */}
            <span style={{ fontWeight:700, fontSize:14, color:darkMode?"#E2E8F0":"#1B2559", whiteSpace:"nowrap" }}>
              {{"tickets":"🎫 Tickets","historial":"🗂️ Historial","calendario":"📅 Calendario","reportes":"📄 Reportes","fichaje":"🕐 Fichaje","nominas":"💰 Nóminas","perfil":"👤 Perfil","comunicacion":"📣 Comunicación","rrhh":"👔 RRHH","proyectos":"📊 Proyectos","salas":"🏛️ Salas","coches":"🚗 Coches","vacaciones":"🏖️ Vacaciones","permisos":"🔐 Permisos"}[seccion] || ""}
            </span>

            {/* Selector empresa */}
            <div style={{ display:"flex", alignItems:"center", gap:8, background: darkMode?"#1E293B":"#F4F7FE", border:`1px solid ${darkMode?"#2E3A55":"#E0E5F2"}`, borderRadius:8, padding:"6px 12px", cursor:"pointer", flexShrink:0 }}>
              <span style={{ fontSize:14 }}>🏢</span>
              <span style={{ color: darkMode?"#E2E8F0":"#1B2559", fontSize:13, fontWeight:600, whiteSpace:"nowrap" }}>
                {EMPRESAS.find(e=>e.id===usuario?.empresaId)?.nombre || "Todas las empresas"}
              </span>
              <span style={{ color: darkMode?"#64748B":"#A3AED0", fontSize:12 }}>▾</span>
            </div>

            {/* Buscador */}
            <div style={{ flex:1, maxWidth:480, position:"relative" }}>
              <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color: darkMode?"#475569":"#A3AED0", fontSize:15 }}>🔍</span>
              <input
                placeholder="Buscar tickets, proyectos, personas..."
                style={{ width:"100%", height:38, paddingLeft:36, paddingRight:12, background: darkMode?"#1E293B":"#F4F7FE", border:`1px solid ${darkMode?"#2E3A55":"#E0E5F2"}`, borderRadius:8, color: darkMode?"#E2E8F0":"#1B2559", fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}
              />
            </div>

            {/* Acciones derecha */}
            <div style={{ display:"flex", alignItems:"center", gap:8, marginLeft:"auto" }}>
              {fichajeActivo && (
                <span style={{ background:"#38A16922", color:"#38A169", border:"1px solid #38A16944", borderRadius:6, padding:"4px 10px", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>
                  🟢 {new Date(fichajeActivo.entrada).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})}
                </span>
              )}
              {/* Switch Web */}
              <div style={{ display:"flex", alignItems:"center", gap:4, background: darkMode?"#1E293B":"#F4F7FE", border:`1px solid ${darkMode?"#2E3A55":"#E0E5F2"}`, borderRadius:8, padding:"5px 10px", fontSize:12, fontWeight:600, color: darkMode?"#94A3B8":"#68769F" }}>
                <span>🖥</span>
                <span>Web</span>
              </div>
              {/* Avatar */}
              <div style={{ width:36, height:36, borderRadius:"50%", background: empColor+"33", border:`2px solid ${empColor}`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color: empColor, fontSize:12, flexShrink:0, cursor:"pointer" }} onClick={() => setSeccion("perfil")}>
                {usuario?.nombre?.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()||"U"}
              </div>
            </div>
          </div>

          {/* Contenido de cada sección */}
          <div className="main-content" style={{ flex:1, padding:"24px 28px", overflowY:"auto", overflowX:"hidden" }}>
{/* BANNER COMUNICADOS ACTIVOS */}
        {comunicados.length > 0 && (() => {
          // Mostrar solo el más reciente como banner
          const c = comunicados[0];
          const empresa = EMPRESAS.find(e => e.id === c.empresaId);
          const autor   = USUARIOS.find(u => u.id === c.autorId);
          return (
            <div style={{ background: darkMode ? "#0F172A" : "#EFF6FF", border: `1px solid ${empresa?.color || "#3182CE"}55`, borderLeft: `4px solid ${empresa?.color || "#3182CE"}`, borderRadius: 10, padding: "12px 18px", marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>💬</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                  <span style={{ color: empresa?.color || "#3182CE", fontSize: 12, fontWeight: 800 }}>{c.titulo}</span>
                  <span style={{ color: darkMode ? "#475569" : "#94A3B8", fontSize: 11 }}>— {autor?.nombre || "Sistema"} · {empresa?.nombre || ""}</span>
                  {comunicados.length > 1 && (
                    <button onClick={() => setSeccion("comunicacion")} style={{ background: "#3182CE22", border: "1px solid #3182CE44", borderRadius: 5, padding: "1px 8px", color: "#3182CE", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                      +{comunicados.length - 1} más
                    </button>
                  )}
                </div>
                {c.cuerpo && <p style={{ margin: 0, color: darkMode ? "#94A3B8" : "#475569", fontSize: 12, lineHeight: 1.5 }}>{c.cuerpo}</p>}
              </div>
            </div>
          );
        })()}

        {/* BANNER DIRECTOR */}
        {["director","ceo"].includes(usuario?.rol) && (
          <div className="banner-director" style={{ background: "linear-gradient(135deg, #1A2235, #2D3748)", border: "1px solid #F6AD5533", borderRadius: 12, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "#F6AD5522", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>👑</div>
            <div>
              <p style={{ margin: 0, color: "#F6AD55", fontWeight: 800, fontSize: 14 }}>Panel de Dirección General — Miguel Manzano</p>
              <p style={{ margin: "2px 0 0", color: darkMode ? "#64748B" : "#475569", fontSize: 12 }}>Tienes acceso completo a todos los tickets de todas las empresas del grupo</p>
            </div>
          </div>
        )}

        {seccion === "reportes" && can("tickets","administracion") && (
          <Reportes tickets={tickets} usuarioActual={usuario} darkMode={darkMode} EMPRESAS={EMPRESAS} USUARIOS={USUARIOS} />
        )}

        {seccion === "historial" && can("tickets") && (
          <>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ margin: "0 0 4px", color: darkMode ? "#E2E8F0" : "#0F172A", fontWeight: 800, fontSize: 18 }}>🗂️ Historial</h2>
              <p style={{ margin: 0, color: darkMode ? "#475569" : "#64748B", fontSize: 13 }}>Tickets finalizados — completados y cancelados</p>
            </div>
            {/* Sub-pestañas */}
            <div className="historial-subtabs" style={{ display: "flex", gap: 2, background: darkMode ? "#111827" : "#FFFFFF", borderRadius: 8, padding: 3, border: `1px solid ${darkMode ? "#1E293B" : "#E2E8F0"}`, marginBottom: 20, width: "fit-content" }}>
              {[["completados", `✅ Completados (${ticketsCompletados.length})`], ["cancelados", `❌ Cancelados (${ticketsCancelados.length})`]].map(([v, l]) => (
                <button key={v} onClick={() => setSubHistorial(v)}
                  style={{ fontFamily: "inherit", fontSize: 12, fontWeight: 700, padding: "7px 18px", borderRadius: 6, border: "none", cursor: "pointer",
                    background: subHistorial === v ? (v === "completados" ? "#38A169" : "#E53E3E") : "transparent",
                    color: subHistorial === v ? "#fff" : "#64748B" }}>{l}
                </button>
              ))}
            </div>
            {/* Lista */}
            {(subHistorial === "completados" ? ticketsCompletados : ticketsCancelados)
              .filter(t => !filtros.buscar || t.titulo.toLowerCase().includes(filtros.buscar.toLowerCase()))
              .length === 0 ? (
              <div style={{ textAlign: "center", padding: "70px 20px" }}>
                <p style={{ fontSize: 50, marginBottom: 12 }}>{subHistorial === "completados" ? "✅" : "❌"}</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: darkMode ? "#475569" : "#64748B" }}>
                  No hay tickets {subHistorial === "completados" ? "completados" : "cancelados"} aún
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
                  <input style={{ ...inpF, minWidth: 220 }} value={filtros.buscar} onChange={e => setFiltros(f => ({ ...f, buscar: e.target.value }))} placeholder="🔍 Buscar..." />
                </div>
                <div className="tickets-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
                  {(subHistorial === "completados" ? ticketsCompletados : ticketsCancelados)
                    .filter(t => !filtros.buscar || t.titulo.toLowerCase().includes(filtros.buscar.toLowerCase()))
                    .map(t => <TarjetaTicket key={t.id} ticket={t} onClick={() => setDetalle(t)} />)}
                </div>
              </>
            )}
          </>
        )}

        {seccion === "calendario" && can("calendario") && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ margin: "0 0 4px", color: darkMode ? "#E2E8F0" : "#0F172A", fontWeight: 800, fontSize: 18 }}>📅 Mi Calendario</h2>
              <p style={{ margin: 0, color: darkMode ? "#475569" : "#64748B", fontSize: 13 }}>Trabajos asignados — aparecen desde la fecha de asignación</p>
            </div>
            <Calendario tickets={tickets} ticketsPersonales={misTicketsPersonales.filter(t => t.creadoPor === usuarioId)} usuarioActual={usuario} onVerTicket={t => setDetalle(t)} onVerTicketPersonal={t => setDetalleMiTicket(t)} />
          </div>
        )}

        {seccion === "tickets" && can("tickets") && (
          <>
            {/* ESTADÍSTICAS — clicables */}
            <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: `repeat(4,1fr)`, gap: 12, marginBottom: 24 }}>
              {[
                ["Mis tickets",  stats.total,       "#94A3B8", "🎫", "kpi_total"],
                ["Solicitados",  stats.solicitados, "#805AD5", "📨", "kpi_solicitados"],
                ["Pendientes",   stats.pendientes,  "#718096", "⏳", "kpi_pendientes"],
                ["En progreso",  stats.enProgreso,  "#D4A017", "⚙️", "kpi_progreso"],
                ["Completados",  stats.completados, "#38A169", "✅", "kpi_completados"],
                ...((esEncargado || esDirCeo) ? [["Sin asignar", stats.sinAsignar, "#E53E3E", "📋", "kpi_sinasignar"]] : []),
              ].map(([l, v, c, ic, accion]) => {
                const activo = filtros.estado === accion;

                const handleClick = () => {
                  setSeccion("tickets");
                  if (activo) {
                    setFiltros(f => ({ ...f, estado: "todos" }));
                    setVista("mis");
                  } else {
                    setFiltros(f => ({ ...f, estado: accion }));
                  }
                };

                return (
                  <div key={l} onClick={handleClick}
                    style={{ background: activo ? c + "18" : darkMode ? "#111827" : "#FFFFFF", border: `1px solid ${activo ? c + "66" : darkMode ? "#1E293B" : "#E2E8F0"}`, borderRadius: 10, padding: "16px 18px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", transition: "all .15s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = c + "88"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = activo ? c + "66" : darkMode ? "#1E293B" : "#E2E8F0"; e.currentTarget.style.transform = "none"; }}>
                    <div style={{ width: 38, height: 38, borderRadius: 8, background: c + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>{ic}</div>
                    <div>
                      <p style={{ margin: 0, color: activo ? c : "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{l}</p>
                      <p style={{ margin: "2px 0 0", color: c, fontSize: 24, fontWeight: 900, lineHeight: 1 }}>{v}</p>
                    </div>
                    {activo && <span style={{ marginLeft: "auto", color: c, fontSize: 10, fontWeight: 700 }}>●</span>}
                  </div>
                );
              })}
            </div>

            {/* FILTROS */}
            <div className="filters-row" style={{ display: "flex", gap: 8, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>


              {/* Selector empresa — solo para director/ceo en vista todos */}
              {esDirCeo && vista === "todos" && (
                <select
                  value={filtros.empresa || "todas"}
                  onChange={e => setFiltros(f => ({...f, empresa: e.target.value}))}
                  style={{ height:32, paddingLeft:8, paddingRight:24, background: darkMode?"#1E293B":"#F8FAFC", border:`1px solid ${darkMode?"#2E3A55":"#E2E8F0"}`, borderRadius:8, color: darkMode?"#E2E8F0":"#0F172A", fontSize:12, outline:"none", fontFamily:"inherit", cursor:"pointer" }}>
                  <option value="todas">Todas las empresas</option>
                  {EMPRESAS.filter(e => e.id !== 0).map(e => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              )}

              {/* Buscador compacto */}
              <div style={{ position: "relative", minWidth: 140, maxWidth: 220 }}>
                <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: darkMode ? "#475569" : "#94A3B8", pointerEvents: "none" }}>🔍</span>
                <input value={filtros.buscar} onChange={e => setFiltros(f => ({ ...f, buscar: e.target.value }))} placeholder="Buscar..."
                  style={{ width: "100%", height: 32, paddingLeft: 28, paddingRight: 10, background: darkMode ? "#1E293B" : "#F8FAFC", border: `1px solid ${darkMode ? "#2E3A55" : "#E2E8F0"}`, borderRadius: 8, color: darkMode ? "#E2E8F0" : "#0F172A", fontSize: 12, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>


              {/* Botones acción */}
              <div style={{ display: "flex", gap: 6, marginLeft: "auto", alignItems: "center", flexShrink: 0 }}>
                <button onClick={() => { if (Notification.permission === "default") Notification.requestPermission(); setModalMisTickets(true); }}
                  className="btn-mis-tickets" style={{ ...btnS, background: darkMode ? "#1E293B" : "#F1F5F9", color: darkMode ? "#94A3B8" : "#475569", border: `1px solid ${darkMode ? "#2E3A55" : "#E2E8F0"}`, padding: "7px 14px", fontSize: 12 }}>
                  📝 Mis Tickets {misTicketsPersonales.filter(t => t.creadoPor === usuarioId && t.estado !== "hecho").length > 0 && <span style={{ background: "#E53E3E", color: "#fff", borderRadius: 99, padding: "1px 6px", fontSize: 10, fontWeight: 700, marginLeft: 4 }}>{misTicketsPersonales.filter(t => t.creadoPor === usuarioId && t.estado !== "hecho").length}</span>}
                </button>
                <button onClick={() => setModalCrear(true)} className="btn-nuevo"
                  style={{ ...btnS, background: empColor, color: "#fff", padding: "7px 16px", fontSize: 12, fontWeight: 700 }}>
                  + Nuevo Ticket
                </button>
              </div>
            </div>

            {/* LISTA */}
            {ticketsFiltrados.length === 0 ? (
              <div style={{ textAlign: "center", padding: "70px 20px" }}>
                <p style={{ fontSize: 50, marginBottom: 12 }}>📭</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: darkMode ? "#475569" : "#64748B" }}>No hay tickets todavía</p>
                <p style={{ fontSize: 13, color: darkMode ? "#334155" : "#94A3B8" }}>Pulsa "+ Nuevo Ticket" para crear el primero</p>
              </div>
            ) : (
              <div className="tickets-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
                {ticketsFiltrados.map(t => <TarjetaTicket key={t.id} ticket={t} onClick={() => setDetalle(t)} />)}
              </div>
            )}
          </>
        )}

        {/* ── PANEL DE EQUIPO (solo encargados) ── */}
        {seccion === "equipo" && can("tickets","administracion") && (
          <PanelEquipo
            darkMode={darkMode}
            usuario={usuario}
            usuarioId={usuarioId}
            tickets={tickets}
            empColor={empColor}
            USUARIOS={USUARIOS}
            EMPRESAS={EMPRESAS}
            onVerTicket={setDetalle}
            onActualizar={actualizarTicket}
          />
        )}

        {/* ── GESTIÓN RRHH ── */}
        {seccion === "gestion_nominas" && can("nominas","administracion") && (
          <GestionNominasRRHH
            darkMode={darkMode}
            usuario={usuario}
            db={db}
            USUARIOS={USUARIOS}
            EMPRESAS={EMPRESAS}
            empColor={empColor}
          />
        )}
        {seccion === "gestion_vacaciones" && can("vacaciones","administracion") && (
          <GestionVacacionesRRHH
            darkMode={darkMode}
            usuario={usuario}
            db={db}
            USUARIOS={USUARIOS}
            EMPRESAS={EMPRESAS}
            empColor={empColor}
          />
        )}
        {seccion === "gestion_fichajes" && can("fichaje","administracion") && (
          <GestionFichajesRRHH
            darkMode={darkMode}
            usuario={usuario}
            db={db}
            USUARIOS={USUARIOS}
            EMPRESAS={EMPRESAS}
            empColor={empColor}
          />
        )}

        {/* ── COMUNICACIÓN ── */}
        {seccion === "comunicacion" && can("comunicacion") && (
          <SeccionComunicacion
            darkMode={darkMode}
            usuario={usuario}
            permisoCrear={can("comunicacion","creacion")}
            usuarioId={usuarioId}
            comunicados={comunicados}
            db={db}
            empColor={empColor}
            USUARIOS={USUARIOS}
            EMPRESAS={EMPRESAS}
          />
        )}

        {/* ── PROYECTOS ── */}
        {seccion === "proyectos" && can("proyectos") && (
          <SeccionProyectos
            db={db} darkMode={darkMode} usuario={usuario} usuarioId={usuarioId}
            empColor={empColor} USUARIOS={USUARIOS} EMPRESAS={EMPRESAS} permisoCrear={can("proyectos","creacion")}
          />
        )}

        {/* ── FICHAJE ── */}
        {seccion === "fichaje" && can("fichaje") && <SeccionFichaje darkMode={darkMode} fichajes={fichajes} fichajeActivo={fichajeActivo} ficharEntrada={ficharEntrada} ficharSalida={ficharSalida} vacaciones={misVacaciones} />}

        {seccion === "vacaciones" && can("vacaciones") && <SeccionVacaciones db={db} darkMode={darkMode} usuario={usuario} USUARIOS={USUARIOS} EMPRESAS={EMPRESAS} empColor={empColor} esAprobador={["encargado","director","ceo"].includes(usuario?.rol)} />}

        {seccion === "permisos" && usuario?.rol === "administrador" && <SeccionPermisos db={db} darkMode={darkMode} usuario={usuario} USUARIOS={USUARIOS} EMPRESAS={EMPRESAS} empColor={empColor} />}

        {/* ── NÓMINAS ── */}
        {seccion === "nominas" && can("nominas") && (() => {
          const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
          return (
            <div style={{ maxWidth:800 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24, flexWrap:"wrap", gap:12 }}>
                <div>
                  <h2 style={{ margin:"0 0 4px", color: darkMode?"#E2E8F0":"#0F172A", fontWeight:800, fontSize:18 }}>💰 Nóminas</h2>
                  <p style={{ margin:0, color: darkMode?"#475569":"#64748B", fontSize:13 }}>
                    Tus nóminas disponibles para descargar
                  </p>
                </div>
              </div>
              {nominas.length === 0 ? (
                <div style={{ textAlign:"center", padding:"70px 20px" }}>
                  <p style={{ fontSize:50, marginBottom:12 }}>💰</p>
                  <p style={{ fontSize:15, fontWeight:700, color: darkMode?"#475569":"#64748B" }}>No hay nóminas disponibles</p>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {[...nominas].sort((a,b)=>String(b.mes||b.fecha||"").localeCompare(String(a.mes||a.fecha||""))).map(n => {
                    // Periodo: "YYYY-MM" → "Junio 2026" (admite formato antiguo mes numérico + anio)
                    let periodo = "";
                    if (typeof n.mes === "string" && n.mes.includes("-")) {
                      const [aa, mm] = n.mes.split("-");
                      periodo = meses[Number(mm)-1] ? `${meses[Number(mm)-1]} ${aa}` : n.mes;
                    } else if (n.mes) {
                      periodo = `${meses[n.mes-1] || ""} ${n.anio || ""}`.trim();
                    }
                    const fileUrl = n.url || n.dataUrl;
                    return (
                      <div key={n.id} style={{ background: darkMode?"#111827":"#FFFFFF", border:`1px solid ${darkMode?"#1E293B":"#E2E8F0"}`, borderRadius:10, padding:"14px 18px", display:"flex", alignItems:"center", gap:14 }}>
                        <div style={{ width:42, height:42, borderRadius:8, background:"#F6AD5522", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>💰</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ margin:"0 0 3px", color: darkMode?"#E2E8F0":"#0F172A", fontSize:14, fontWeight:700 }}>
                            {periodo || n.nombre}
                          </p>
                          <p style={{ margin:0, color: darkMode?"#334155":"#94A3B8", fontSize:11 }}>{n.nombre}</p>
                        </div>
                        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                          {fileUrl ? (
                            <a href={fileUrl} download={n.nombre || "nomina.pdf"} target="_blank" rel="noreferrer"
                              style={{ background:"#3182CE22", border:"1px solid #3182CE44", borderRadius:7, padding:"7px 14px", color:"#3182CE", fontSize:12, fontWeight:700, textDecoration:"none" }}>
                              ⬇️ Descargar
                            </a>
                          ) : (
                            <span style={{ color: darkMode?"#475569":"#94A3B8", fontSize:11, fontStyle:"italic" }}>Archivo no disponible</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── SALAS ── */}
        {seccion === "salas" && can("salas") && (
          <SeccionSalas db={db} darkMode={darkMode} usuario={usuario} empColor={empColor} />
        )}

        {/* ── COCHES ── */}
        {seccion === "coches" && can("coches") && (
          <SeccionCoches db={db} darkMode={darkMode} usuario={usuario} empColor={empColor} />
        )}

        {/* ── PERFIL ── */}
        {seccion === "perfil" && can("perfil") && <SeccionPerfil darkMode={darkMode} usuarioId={usuarioId} usuario={usuario} pins={pins} onCambiarPin={cambiarPin} empColor={empColor} EMPRESAS={EMPRESAS} />}

      </div>{/* /contenido secciones */}
      </div>{/* /contenido principal */}
      </div>{/* /layout sidebar+contenido */}

      {modalCrear && <ModalCrearTicket usuarioActual={usuario} onClose={() => setModalCrear(false)} onCrear={crearTicket} />}
      {detalle    && <ModalDetalle ticket={detalle} usuarioActual={usuario} onClose={() => setDetalle(null)} onActualizar={(t) => actualizarTicket(t)} onBorrar={() => borrarTicket(detalle)} />}
      {modalMisTickets && <ModalMisTickets usuarioId={usuarioId} tickets={misTicketsPersonales.filter(t => t.creadoPor === usuarioId)} onClose={() => setModalMisTickets(false)} onCrear={guardarTicketPersonal} onVerDetalle={t => { setDetalleMiTicket(t); setModalMisTickets(false); }} />}
      {detalleMiTicket && <ModalDetalleMiTicket ticket={detalleMiTicket} onClose={() => setDetalleMiTicket(null)} onActualizar={actualizarTicketPersonal} />}
      {modalAdmin && <ModalAdministracion key={configVersion} onClose={() => setModalAdmin(false)} />}

      {/* Modal crear comunicado */}
      {modalComun && (
        <ModalComunicado
          darkMode={darkMode}
          usuarioId={usuarioId}
          empresaId={usuario?.empresaId ?? null}
          onClose={() => setModalComun(false)}
        />
      )}
      {comunicadoEditar && (
        <ModalComunicado
          darkMode={darkMode}
          usuarioId={usuarioId}
          empresaId={usuario?.empresaId ?? null}
          onClose={() => setComunicadoEditar(null)}
          comunicadoInicial={comunicadoEditar}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MÓDULO: Comunicación
// ═══════════════════════════════════════════════════════════════════

const TIPOS_COMUNICADO = [
  { id: "noticia",     label: "Noticia",      icon: "📰", color: "#3182CE", bg: "#3182CE15" },
  { id: "informativo", label: "Informativo",  icon: "ℹ️",  color: "#38A169", bg: "#38A16915" },
  { id: "urgente",     label: "Urgente",      icon: "🚨", color: "#E53E3E", bg: "#E53E3E15" },
  { id: "aviso",       label: "Aviso",        icon: "⚠️",  color: "#D4A017", bg: "#D4A01715" },
  { id: "evento",      label: "Evento",       icon: "🎉", color: "#805AD5", bg: "#805AD515" },
];

function SeccionComunicacion({ darkMode, usuario, usuarioId, comunicados, db, empColor, USUARIOS, EMPRESAS, permisoCrear }) {
  const [filtroTipo, setFiltroTipo]   = useState("todos");
  const [buscar, setBuscar]           = useState("");
  const [modalNuevo, setModalNuevo]   = useState(false);
  const [detalle, setDetalle]         = useState(null);
  const [editando, setEditando]       = useState(null);

  const puedeCrear = !!permisoCrear;

  const comunicadosFiltrados = (comunicados || [])
    .filter(c => c && c.titulo) // solo comunicados válidos
    .filter(c => {
      // Filtrar por destinatario
      if (!c.destinatarios || c.destinatarios.tipo === "todos") return true;
      if (c.destinatarios.tipo === "empresas") return (c.destinatarios.empresaIds||[]).includes(usuario?.empresaId);
      if (c.destinatarios.tipo === "usuarios")  return (c.destinatarios.usuarioIds||[]).includes(usuarioId);
      return true;
    })
    .filter(c => filtroTipo === "todos" || c.tipo === filtroTipo)
    .filter(c => !buscar || c.titulo?.toLowerCase().includes(buscar.toLowerCase()) || c.cuerpo?.toLowerCase().includes(buscar.toLowerCase()))
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const dm = darkMode;
  const cardBg    = dm ? "#111827" : "#FFFFFF";
  const border    = dm ? "#1E293B" : "#E2E8F0";
  const textPri   = dm ? "#E2E8F0" : "#0F172A";
  const textMuted = dm ? "#64748B" : "#94A3B8";

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* Cabecera */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ margin:"0 0 4px", color:textPri, fontWeight:800, fontSize:20 }}>📣 Comunicación</h2>
          <p style={{ margin:0, color:textMuted, fontSize:13 }}>Canal interno del Grupo Laura Otero</p>
        </div>
        {puedeCrear && (
          <button onClick={() => setModalNuevo(true)}
            style={{ fontFamily:"inherit", fontSize:13, fontWeight:700, padding:"9px 20px", borderRadius:8, border:"none", cursor:"pointer", background:empColor, color:"#fff" }}>
            + Nuevo comunicado
          </button>
        )}
      </div>

      {/* Filtros */}
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
        {/* Buscador */}
        <div style={{ position:"relative", minWidth:180, maxWidth:260 }}>
          <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:13, color:textMuted, pointerEvents:"none" }}>🔍</span>
          <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar comunicado..."
            style={{ width:"100%", height:36, paddingLeft:30, paddingRight:10, background:dm?"#1E293B":"#F8FAFC", border:`1px solid ${border}`, borderRadius:8, color:textPri, fontSize:12, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
        </div>

        {/* Pills de tipo */}
        {[{id:"todos",label:"Todos",icon:"📋",color:empColor}, ...TIPOS_COMUNICADO].map(t => {
          const activo = filtroTipo === t.id;
          return (
            <button key={t.id} onClick={() => setFiltroTipo(t.id)}
              style={{ fontFamily:"inherit", fontSize:11, fontWeight:600, padding:"5px 13px", borderRadius:99, border:`1px solid ${activo ? t.color : border}`, cursor:"pointer", background: activo ? t.color+"22" : "transparent", color: activo ? t.color : textMuted, transition:"all .15s", display:"flex", alignItems:"center", gap:5, whiteSpace:"nowrap" }}>
              {t.icon} {t.label}
              {t.id !== "todos" && <span style={{ background:dm?"#1E293B":"#F1F5F9", borderRadius:99, padding:"0 6px", fontSize:10 }}>
                {comunicados.filter(c => c.tipo === t.id).length}
              </span>}
            </button>
          );
        })}
      </div>

      {/* Grid de comunicados */}
      {comunicadosFiltrados.length === 0 ? (
        <div style={{ textAlign:"center", padding:"80px 20px" }}>
          <p style={{ fontSize:48, marginBottom:12 }}>📭</p>
          <p style={{ fontSize:15, fontWeight:700, color:textMuted }}>Sin comunicados</p>
          <p style={{ fontSize:13, color:textMuted, opacity:.7 }}>No hay comunicados para este filtro.</p>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:16 }}>
          {comunicadosFiltrados.map(c => {
            const tipo    = TIPOS_COMUNICADO.find(t => t.id === c.tipo) || TIPOS_COMUNICADO[1];
            const autor   = USUARIOS.find(u => u.id === c.autorId);
            const empresa = EMPRESAS.find(e => e.id === c.empresaId);
            const puedeEditar = usuario?.id === c.autorId || ["director","ceo","administrador"].includes(usuario?.rol);
            const caducaDate  = c.fechaCaducidad ? new Date(c.fechaCaducidad) : null;
            const caducada    = caducaDate && caducaDate < new Date();

            return (
              <div key={c.id} onClick={() => setDetalle(c)}
                style={{ background:cardBg, border:`1px solid ${caducada ? border+"88" : tipo.color+"55"}`, borderRadius:12, padding:"16px 18px", cursor:"pointer", opacity: caducada ? .6 : 1, transition:"box-shadow .15s", position:"relative" }}
                onMouseEnter={e => e.currentTarget.style.boxShadow=`0 4px 20px ${tipo.color}22`}
                onMouseLeave={e => e.currentTarget.style.boxShadow="none"}>

                {/* Badge tipo */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                  <span style={{ background:tipo.bg, color:tipo.color, border:`1px solid ${tipo.color}44`, borderRadius:99, padding:"3px 10px", fontSize:11, fontWeight:700, display:"flex", alignItems:"center", gap:5 }}>
                    {tipo.icon} {tipo.label}
                  </span>
                  {puedeEditar && (
                    <div style={{ display:"flex", gap:4 }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setEditando(c); setModalNuevo(true); }}
                        style={{ background:"none", border:"none", cursor:"pointer", color:textMuted, fontSize:14, padding:"2px 5px" }} title="Editar">✏️</button>
                      <button onClick={() => { deleteDoc(doc(db,"comunicados",c.id)); }}
                        style={{ background:"none", border:"none", cursor:"pointer", color:textMuted, fontSize:14, padding:"2px 5px" }} title="Eliminar">🗑️</button>
                    </div>
                  )}
                </div>

                {/* Título y cuerpo */}
                <h3 style={{ margin:"0 0 6px", color:textPri, fontSize:15, fontWeight:700, lineHeight:1.3 }}>{c.titulo}</h3>
                {c.cuerpo && <p style={{ margin:"0 0 12px", color:textMuted, fontSize:13, lineHeight:1.5, display:"-webkit-box", WebkitLineClamp:3, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{c.cuerpo}</p>}

                {/* PDF */}
                {c.adjuntoPDF && (
                  <div style={{ background:dm?"#1E293B":"#F8FAFC", border:`1px solid ${border}`, borderRadius:7, padding:"7px 12px", marginBottom:10, display:"flex", alignItems:"center", gap:8 }} onClick={e => e.stopPropagation()}>
                    <span style={{ fontSize:16 }}>📄</span>
                    <a href={c.adjuntoPDF.dataUrl} download={c.adjuntoPDF.nombre} style={{ color:empColor, fontSize:12, fontWeight:600, textDecoration:"none" }}>{c.adjuntoPDF.nombre}</a>
                  </div>
                )}

                {/* Destinatarios */}
                <div style={{ marginBottom:10 }}>
                  {!c.destinatarios || c.destinatarios.tipo === "todos"
                    ? <span style={{ color:textMuted, fontSize:11 }}>🌐 Todos los usuarios</span>
                    : c.destinatarios.tipo === "empresas"
                    ? <span style={{ color:textMuted, fontSize:11 }}>🏢 {(c.destinatarios.empresaIds||[]).map(id => EMPRESAS.find(e=>e.id===id)?.nombre).filter(Boolean).join(", ")}</span>
                    : <span style={{ color:textMuted, fontSize:11 }}>👤 {(c.destinatarios.usuarioIds||[]).length} usuario{(c.destinatarios.usuarioIds||[]).length !== 1 ? "s" : ""}</span>
                  }
                </div>

                {/* Footer */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:10, borderTop:`1px solid ${border}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:22, height:22, borderRadius:"50%", background:(empresa?.color||empColor)+"33", border:`1.5px solid ${empresa?.color||empColor}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:800, color:empresa?.color||empColor }}>
                      {autor?.nombre?.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()||"?"}
                    </div>
                    <span style={{ color:textMuted, fontSize:11 }}>{autor?.nombre?.split(" ").slice(0,2).join(" ")}</span>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <span style={{ color:textMuted, fontSize:11 }}>{c.fecha ? new Date(c.fecha).toLocaleDateString("es-ES",{day:"2-digit",month:"short"}) : ""}</span>
                    {caducaDate && (
                      <span style={{ display:"block", color: caducada ? "#E53E3E" : "#D4A017", fontSize:10 }}>
                        {caducada ? "⚠️ Caducado" : `⏰ Caduca ${new Date(c.fechaCaducidad).toLocaleDateString("es-ES",{day:"2-digit",month:"short"})}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal nuevo/editar comunicado */}
      {modalNuevo && (
        <ModalNuevoComunicado
          darkMode={dm}
          usuario={usuario}
          usuarioId={usuarioId}
          db={db}
          empColor={empColor}
          USUARIOS={USUARIOS}
          EMPRESAS={EMPRESAS}
          comunicadoInicial={editando}
          onClose={() => { setModalNuevo(false); setEditando(null); }}
        />
      )}

      {/* Modal detalle */}
      {detalle && (
        <DetalleComunicado
          darkMode={dm}
          c={detalle}
          USUARIOS={USUARIOS}
          EMPRESAS={EMPRESAS}
          empColor={empColor}
          onClose={() => setDetalle(null)}
        />
      )}
    </div>
  );
}

function ModalNuevoComunicado({ darkMode, usuario, usuarioId, db, empColor, USUARIOS, EMPRESAS, comunicadoInicial, onClose }) {
  const [tipo, setTipo]               = useState(comunicadoInicial?.tipo || "informativo");
  const [titulo, setTitulo]           = useState(comunicadoInicial?.titulo || "");
  const [cuerpo, setCuerpo]           = useState(comunicadoInicial?.cuerpo || "");
  const [destTipo, setDestTipo]       = useState(comunicadoInicial?.destinatarios?.tipo || "todos");
  const [destEmpresas, setDestEmpresas] = useState(comunicadoInicial?.destinatarios?.empresaIds || []);
  const [destUsuarios, setDestUsuarios] = useState(comunicadoInicial?.destinatarios?.usuarioIds || []);
  const [fechaCad, setFechaCad]       = useState(comunicadoInicial?.fechaCaducidad ? new Date(comunicadoInicial.fechaCaducidad).toISOString().split("T")[0] : "");
  const [adjuntoPDF, setAdjuntoPDF]   = useState(comunicadoInicial?.adjuntoPDF || null);
  const [loading, setLoading]         = useState(false);
  const [buscarUser, setBuscarUser]   = useState("");

  const dm = darkMode;
  const s = {
    inp:   { fontFamily:"inherit", fontSize:13, background:dm?"#1A2235":"#F8FAFC", border:`1px solid ${dm?"#2E3A55":"#CBD5E1"}`, borderRadius:7, padding:"9px 12px", color:dm?"#E2E8F0":"#0F172A", outline:"none", width:"100%", boxSizing:"border-box" },
    label: { display:"block", color:dm?"#64748B":"#475569", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".4px", marginBottom:5 },
  };

  const handlePDF = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_ARCHIVO_BYTES) { alert("El PDF no puede superar los 700 KB."); return; }
    const reader = new FileReader();
    reader.onload = ev => setAdjuntoPDF({ nombre: file.name, dataUrl: ev.target.result });
    reader.readAsDataURL(file);
  };

  const guardar = async () => {
    if (!titulo.trim()) return;
    setLoading(true);
    const empresa = EMPRESAS.find(e => e.id === usuario?.empresaId);
    const data = {
      tipo,
      titulo:    titulo.trim(),
      cuerpo:    cuerpo.trim() || null,
      autorId:   usuarioId,
      empresaId: usuario?.empresaId,
      fecha:     comunicadoInicial?.fecha || new Date().toISOString(),
      fechaCaducidad: fechaCad ? new Date(fechaCad).toISOString() : null,
      adjuntoPDF: adjuntoPDF || null,
      destinatarios: {
        tipo: destTipo,
        ...(destTipo === "empresas" && { empresaIds: destEmpresas }),
        ...(destTipo === "usuarios" && { usuarioIds: destUsuarios }),
      },
    };
    if (comunicadoInicial) {
      await updateDoc(doc(db, "comunicados", comunicadoInicial.id), { ...data, fechaEditado: new Date().toISOString() });
    } else {
      const id = "com_" + Date.now();
      await setDoc(doc(db, "comunicados", id), { ...data, id });
    }
    setLoading(false);
    onClose();
  };

  const tipoActual = TIPOS_COMUNICADO.find(t => t.id === tipo);

  return (
    <div style={{ position:"fixed", inset:0, background:"#00000099", display:"flex", alignItems:"flex-start", justifyContent:"center", zIndex:1000, padding:20, overflowY:"auto" }} onMouseDown={onClose}>
      <div style={{ background:dm?"#111827":"#FFFFFF", border:`1px solid ${dm?"#2E3A55":"#CBD5E1"}`, borderRadius:14, width:"100%", maxWidth:560, padding:28, boxShadow:"0 24px 80px #0008", margin:"auto" }} onMouseDown={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h2 style={{ margin:0, fontSize:17, fontWeight:800, color:dm?"#E2E8F0":"#0F172A" }}>
            {comunicadoInicial ? "✏️ Editar comunicado" : "📣 Nuevo comunicado"}
          </h2>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#64748B", fontSize:22, cursor:"pointer" }}>×</button>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

          {/* Selector tipo */}
          <div>
            <label style={s.label}>Tipo de comunicado</label>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {TIPOS_COMUNICADO.map(t => (
                <button key={t.id} onClick={() => setTipo(t.id)}
                  style={{ fontFamily:"inherit", fontSize:11, fontWeight:700, padding:"5px 13px", borderRadius:99, border:`2px solid ${tipo===t.id ? t.color : dm?"#2E3A55":"#E2E8F0"}`, cursor:"pointer", background: tipo===t.id ? t.color+"22" : "transparent", color: tipo===t.id ? t.color : dm?"#64748B":"#94A3B8", transition:"all .15s" }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Título */}
          <div>
            <label style={s.label}>Título *</label>
            <input style={s.inp} value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej: Reunión el viernes a las 10h" />
          </div>

          {/* Mensaje */}
          <div>
            <label style={s.label}>Mensaje (opcional)</label>
            <textarea style={{ ...s.inp, minHeight:90, resize:"vertical" }} value={cuerpo} onChange={e => setCuerpo(e.target.value)} placeholder="Detalle del comunicado..." />
          </div>

          {/* Destinatarios */}
          <div>
            <label style={s.label}>👥 Destinatarios</label>
            <div style={{ display:"flex", gap:4, marginBottom:10 }}>
              {[["todos","🌐 Todos"],["empresas","🏢 Por empresa"],["usuarios","👤 Por usuario"]].map(([v,l]) => (
                <button key={v} onClick={() => setDestTipo(v)}
                  style={{ fontFamily:"inherit", fontSize:12, fontWeight:600, padding:"6px 14px", borderRadius:7, border:`1px solid ${destTipo===v ? empColor : dm?"#2E3A55":"#E2E8F0"}`, cursor:"pointer", background: destTipo===v ? empColor+"22" : "transparent", color: destTipo===v ? empColor : dm?"#64748B":"#94A3B8" }}>
                  {l}
                </button>
              ))}
            </div>

            {/* Selector empresas */}
            {destTipo === "empresas" && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {EMPRESAS.map(e => {
                  const sel = destEmpresas.includes(e.id);
                  return (
                    <button key={e.id} onClick={() => setDestEmpresas(prev => sel ? prev.filter(x=>x!==e.id) : [...prev,e.id])}
                      style={{ fontFamily:"inherit", fontSize:11, fontWeight:600, padding:"4px 12px", borderRadius:99, border:`1px solid ${sel?e.color:dm?"#2E3A55":"#E2E8F0"}`, cursor:"pointer", background:sel?e.color+"22":"transparent", color:sel?e.color:dm?"#64748B":"#94A3B8", display:"flex", alignItems:"center", gap:5 }}>
                      <span style={{ width:7, height:7, borderRadius:"50%", background:e.color }} />
                      {e.nombre}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Selector usuarios */}
            {destTipo === "usuarios" && (
              <div>
                <input value={buscarUser} onChange={e => setBuscarUser(e.target.value)} placeholder="Buscar usuario..."
                  style={{ ...s.inp, marginBottom:8, height:34 }} />
                <div style={{ maxHeight:180, overflowY:"auto", border:`1px solid ${dm?"#2E3A55":"#E2E8F0"}`, borderRadius:8 }}>
                  {EMPRESAS.map(emp => {
                    const usrs = USUARIOS.filter(u => u.empresaId === emp.id && (!buscarUser || u.nombre.toLowerCase().includes(buscarUser.toLowerCase())));
                    if (!usrs.length) return null;
                    return (
                      <div key={emp.id}>
                        <div style={{ padding:"6px 12px", background:dm?"#0D1424":"#F8FAFC", fontSize:10, fontWeight:700, color:emp.color, textTransform:"uppercase", display:"flex", justifyContent:"space-between" }}>
                          {emp.nombre}
                          <button onClick={() => {
                            const ids = usrs.map(u=>u.id);
                            const allSel = ids.every(id => destUsuarios.includes(id));
                            setDestUsuarios(prev => allSel ? prev.filter(x=>!ids.includes(x)) : [...new Set([...prev,...ids])]);
                          }} style={{ background:"none", border:"none", cursor:"pointer", color:emp.color, fontSize:10, fontWeight:700 }}>
                            {usrs.every(u=>destUsuarios.includes(u.id)) ? "✓ Todos" : "+ Todos"}
                          </button>
                        </div>
                        {usrs.map(u => (
                          <div key={u.id} onClick={() => setDestUsuarios(prev => prev.includes(u.id) ? prev.filter(x=>x!==u.id) : [...prev,u.id])}
                            style={{ padding:"7px 12px", display:"flex", alignItems:"center", gap:8, cursor:"pointer", borderBottom:`1px solid ${dm?"#0D1424":"#F1F5F9"}` }}>
                            <span style={{ width:16, height:16, borderRadius:4, border:`2px solid ${destUsuarios.includes(u.id)?empColor:dm?"#2E3A55":"#CBD5E1"}`, background:destUsuarios.includes(u.id)?empColor:"transparent", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"#fff", flexShrink:0 }}>
                              {destUsuarios.includes(u.id)?"✓":""}
                            </span>
                            <span style={{ fontSize:12, color:dm?"#E2E8F0":"#0F172A" }}>{u.nombre}</span>
                            <span style={{ fontSize:10, color:dm?"#475569":"#94A3B8", marginLeft:"auto" }}>{u.rol}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
                {destUsuarios.length > 0 && <p style={{ margin:"6px 0 0", color:empColor, fontSize:11, fontWeight:600 }}>{destUsuarios.length} usuario{destUsuarios.length>1?"s":""} seleccionado{destUsuarios.length>1?"s":""}</p>}
              </div>
            )}
          </div>

          {/* Fecha caducidad */}
          <div>
            <label style={s.label}>📅 Fecha de caducidad (opcional)</label>
            <input type="date" style={{ ...s.inp, colorScheme:dm?"dark":"light" }} value={fechaCad} onChange={e => setFechaCad(e.target.value)} />
            <p style={{ margin:"4px 0 0", color:dm?"#334155":"#94A3B8", fontSize:11 }}>Si no indicas fecha, el comunicado permanece hasta que lo elimines.</p>
          </div>

          {/* PDF */}
          <div>
            <label style={s.label}>📎 Adjuntar PDF (opcional, máx. 5 MB)</label>
            {adjuntoPDF ? (
              <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", background:dm?"#1E293B":"#F8FAFC", borderRadius:7, border:`1px solid ${dm?"#2E3A55":"#E2E8F0"}` }}>
                <span>📄</span>
                <span style={{ fontSize:12, color:dm?"#E2E8F0":"#0F172A", flex:1 }}>{adjuntoPDF.nombre}</span>
                <button onClick={() => setAdjuntoPDF(null)} style={{ background:"none", border:"none", color:"#E53E3E", cursor:"pointer", fontSize:16 }}>×</button>
              </div>
            ) : (
              <label style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 14px", background:dm?"#1E293B":"#F8FAFC", border:`1px solid ${dm?"#2E3A55":"#E2E8F0"}`, borderRadius:7, cursor:"pointer", fontSize:12, color:dm?"#94A3B8":"#64748B" }}>
                📎 Seleccionar PDF
                <input type="file" accept=".pdf" style={{ display:"none" }} onChange={handlePDF} />
              </label>
            )}
          </div>

          {/* Botones */}
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", paddingTop:6 }}>
            <button onClick={onClose} style={{ fontFamily:"inherit", fontSize:13, fontWeight:600, padding:"9px 18px", borderRadius:7, border:`1px solid ${dm?"#2E3A55":"#CBD5E1"}`, cursor:"pointer", background:"transparent", color:dm?"#94A3B8":"#475569" }}>Cancelar</button>
            <button onClick={guardar} disabled={!titulo.trim() || loading}
              style={{ fontFamily:"inherit", fontSize:13, fontWeight:700, padding:"9px 20px", borderRadius:7, border:"none", cursor: titulo.trim() ? "pointer" : "not-allowed", background: tipoActual?.color || empColor, color:"#fff", opacity: titulo.trim() ? 1 : 0.5 }}>
              {loading ? "Publicando..." : comunicadoInicial ? "💾 Guardar cambios" : "📣 Publicar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetalleComunicado({ darkMode, c, USUARIOS, EMPRESAS, empColor, onClose }) {
  const tipo    = TIPOS_COMUNICADO.find(t => t.id === c.tipo) || TIPOS_COMUNICADO[1];
  const autor   = USUARIOS.find(u => u.id === c.autorId);
  const empresa = EMPRESAS.find(e => e.id === c.empresaId);
  const dm = darkMode;

  return (
    <div style={{ position:"fixed", inset:0, background:"#00000099", display:"flex", alignItems:"flex-start", justifyContent:"center", zIndex:1000, padding:20, overflowY:"auto" }} onMouseDown={onClose}>
      <div style={{ background:dm?"#111827":"#FFFFFF", border:`1px solid ${dm?"#2E3A55":"#CBD5E1"}`, borderRadius:14, width:"100%", maxWidth:600, padding:28, boxShadow:"0 24px 80px #0008", margin:"auto" }} onMouseDown={e => e.stopPropagation()}>

        {/* Badge tipo */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <span style={{ background:tipo.bg, color:tipo.color, border:`1px solid ${tipo.color}44`, borderRadius:99, padding:"4px 12px", fontSize:12, fontWeight:700 }}>
            {tipo.icon} {tipo.label}
          </span>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#64748B", fontSize:22, cursor:"pointer" }}>×</button>
        </div>

        <h2 style={{ margin:"0 0 12px", color:dm?"#E2E8F0":"#0F172A", fontSize:20, fontWeight:800, lineHeight:1.3 }}>{c.titulo}</h2>
        {c.cuerpo && <p style={{ margin:"0 0 18px", color:dm?"#94A3B8":"#475569", fontSize:14, lineHeight:1.65 }}>{c.cuerpo}</p>}

        {c.adjuntoPDF && (
          <div style={{ background:dm?"#1E293B":"#F8FAFC", border:`1px solid ${dm?"#2E3A55":"#E2E8F0"}`, borderRadius:9, padding:"10px 14px", marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20 }}>📄</span>
            <div style={{ flex:1 }}>
              <p style={{ margin:0, fontWeight:700, fontSize:13, color:dm?"#E2E8F0":"#0F172A" }}>{c.adjuntoPDF.nombre}</p>
            </div>
            <a href={c.adjuntoPDF.dataUrl} download={c.adjuntoPDF.nombre}
              style={{ background:empColor, color:"#fff", borderRadius:7, padding:"6px 14px", fontSize:12, fontWeight:700, textDecoration:"none" }}>
              ⬇️ Descargar
            </a>
          </div>
        )}

        <div style={{ paddingTop:14, borderTop:`1px solid ${dm?"#1E293B":"#E2E8F0"}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:(empresa?.color||empColor)+"33", border:`2px solid ${empresa?.color||empColor}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:empresa?.color||empColor }}>
              {autor?.nombre?.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()||"?"}
            </div>
            <div>
              <p style={{ margin:0, fontWeight:700, fontSize:13, color:dm?"#E2E8F0":"#0F172A" }}>{autor?.nombre}</p>
              <p style={{ margin:0, fontSize:11, color:dm?"#475569":"#94A3B8" }}>{empresa?.nombre} · {c.fecha ? new Date(c.fecha).toLocaleDateString("es-ES",{day:"2-digit",month:"long",year:"numeric"}) : ""}</p>
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            {!c.destinatarios || c.destinatarios.tipo === "todos"
              ? <span style={{ color:dm?"#475569":"#94A3B8", fontSize:12 }}>🌐 Todos los usuarios</span>
              : c.destinatarios.tipo === "empresas"
              ? <span style={{ color:dm?"#475569":"#94A3B8", fontSize:12 }}>🏢 {(c.destinatarios.empresaIds||[]).map(id=>EMPRESAS.find(e=>e.id===id)?.nombre).filter(Boolean).join(", ")}</span>
              : <span style={{ color:dm?"#475569":"#94A3B8", fontSize:12 }}>👤 {(c.destinatarios.usuarioIds||[]).length} usuarios</span>
            }
            {c.fechaEditado && <p style={{ margin:"4px 0 0", fontSize:10, color:dm?"#334155":"#CBD5E1" }}>Editado {new Date(c.fechaEditado).toLocaleDateString("es-ES")}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MÓDULO: Panel de Equipo (solo encargados)
// ═══════════════════════════════════════════════════════════════════

function PanelEquipo({ darkMode, usuario, usuarioId, tickets, empColor, USUARIOS, EMPRESAS, onVerTicket, onActualizar }) {
  const [subVista, setSubVista] = useState("sinAsignar");
  const [buscar, setBuscar]     = useState("");
  const [trabajadorSel, setTrabajadorSel] = useState(null);

  const dm       = darkMode;
  const miEmpId  = usuario?.empresaId;
  const miEmpresa = EMPRESAS.find(e => e.id === miEmpId);
  const misTrabs  = USUARIOS.filter(u => u.empresaId === miEmpId && u.id !== usuario?.id); // todos excepto el encargado mismo

  // Tickets de mi empresa (destino o creados por mí)
  const ticketsEmpresa = tickets.filter(t => {
    const eds = t.empresasDestino || [];
    return eds.includes(miEmpId) || t.creadoPor === usuarioId;
  });

  // Sin asignar: pendientes hacia mi empresa sin asignar
  const sinAsignar = ticketsEmpresa.filter(t =>
    t.estado === "Pendiente" &&
    !(t.asignacionesPorEmpresa?.[miEmpId]?.length > 0)
  );

  // En curso: asignados a alguien de mi empresa y activos
  const enCurso = ticketsEmpresa.filter(t =>
    ["Asignado","En progreso"].includes(t.estado) &&
    (t.asignacionesPorEmpresa?.[miEmpId]?.length > 0)
  );

  // Completados de mi empresa
  const completados = ticketsEmpresa.filter(t => t.estado === "Completado");

  const filtrar = (lista) => {
    if (!buscar) return lista;
    return lista.filter(t => t.titulo?.toLowerCase().includes(buscar.toLowerCase()));
  };

  const vistas = [
    { id: "sinAsignar", label: `⏳ Sin asignar`, count: sinAsignar.length, color: "#E53E3E" },
    { id: "enCurso",    label: `⚙️ En curso`,    count: enCurso.length,    color: "#D4A017" },
    { id: "completados",label: `✅ Completados`,  count: completados.length, color: "#38A169" },
  ];

  const listaActual = subVista === "sinAsignar" ? sinAsignar
                    : subVista === "enCurso"    ? enCurso
                    : completados;

  // Si hay un trabajador seleccionado, mostramos TODOS sus tickets (de mi empresa)
  const trabSelObj = trabajadorSel != null ? USUARIOS.find(u => u.id === trabajadorSel) : null;
  const ticketsDeTrab = trabajadorSel != null
    ? ticketsEmpresa.filter(t => (t.asignacionesPorEmpresa?.[miEmpId] || []).includes(trabajadorSel))
    : [];
  const listaMostrada = trabajadorSel != null ? ticketsDeTrab : listaActual;

  const cardBg  = dm ? "#111827" : "#FFFFFF";
  const border  = dm ? "#1E293B" : "#E2E8F0";
  const textPri = dm ? "#E2E8F0" : "#0F172A";
  const muted   = dm ? "#64748B" : "#94A3B8";

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Cabecera */}
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: "0 0 4px", color: textPri, fontWeight: 800, fontSize: 20 }}>
          👥 Panel de equipo — {miEmpresa?.nombre}
        </h2>
        <p style={{ margin: 0, color: muted, fontSize: 13 }}>
          Gestión de tickets de tu empresa
        </p>
      </div>

      {/* KPIs resumen */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 22 }}>
        {vistas.map(v => (
          <div key={v.id} onClick={() => { setSubVista(v.id); setTrabajadorSel(null); }}
            style={{ background: (subVista === v.id && !trabajadorSel) ? v.color + "18" : cardBg, border: `1px solid ${(subVista === v.id && !trabajadorSel) ? v.color : border}`, borderRadius: 12, padding: "16px 20px", cursor: "pointer", transition: "all .15s" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: (subVista === v.id && !trabajadorSel) ? v.color : textPri, lineHeight: 1 }}>{v.count}</div>
            <div style={{ color: (subVista === v.id && !trabajadorSel) ? v.color : muted, fontSize: 12, fontWeight: 700, marginTop: 4 }}>{v.label}</div>
          </div>
        ))}
      </div>

      {/* Resumen por trabajador */}
      <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
        <p style={{ margin: "0 0 12px", color: muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px" }}>
          Carga por trabajador
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {misTrabs.map(u => {
            const asignados = enCurso.filter(t =>
              (t.asignacionesPorEmpresa?.[miEmpId] || []).includes(u.id)
            ).length;
            const totalTk = ticketsEmpresa.filter(t => (t.asignacionesPorEmpresa?.[miEmpId] || []).includes(u.id)).length;
            const sel = trabajadorSel === u.id;
            return (
              <div key={u.id} onClick={() => setTrabajadorSel(prev => prev === u.id ? null : u.id)}
                title={`Ver tickets de ${u.nombre.split(" ")[0]}`}
                style={{ display: "flex", alignItems: "center", gap: 7, background: sel ? empColor + "22" : (dm ? "#0D1424" : "#F8FAFC"), border: `1px solid ${sel ? empColor : border}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", transition: "all .12s" }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.borderColor = empColor + "88"; }}
                onMouseLeave={e => { if (!sel) e.currentTarget.style.borderColor = border; }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: empColor + "33", border: `2px solid ${empColor}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: empColor, fontSize: 10, flexShrink: 0 }}>
                  {u.nombre.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: sel ? empColor : textPri }}>{u.nombre.split(" ")[0]}</p>
                  <p style={{ margin: 0, fontSize: 10, color: asignados > 0 ? empColor : muted }}>
                    {asignados} activo{asignados !== 1 ? "s" : ""}{totalTk > asignados ? ` · ${totalTk} total` : ""}
                  </p>
                </div>
              </div>
            );
          })}
          {misTrabs.length === 0 && (
            <p style={{ color: muted, fontSize: 13 }}>No hay trabajadores en tu empresa.</p>
          )}
        </div>
      </div>

      {/* Buscador */}
      <div style={{ position: "relative", maxWidth: 280, marginBottom: 16 }}>
        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: muted, fontSize: 13 }}>🔍</span>
        <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar ticket..."
          style={{ width: "100%", height: 34, paddingLeft: 30, paddingRight: 10, background: dm ? "#1E293B" : "#F8FAFC", border: `1px solid ${border}`, borderRadius: 8, color: textPri, fontSize: 12, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
      </div>

      {/* Chip de filtro por trabajador */}
      {trabSelObj && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <span style={{ background: empColor + "18", color: empColor, border: `1px solid ${empColor}55`, borderRadius: 99, padding: "5px 12px", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            👤 Tickets de {trabSelObj.nombre}
            <span onClick={() => setTrabajadorSel(null)} style={{ cursor: "pointer", fontWeight: 900, fontSize: 13 }}>✕</span>
          </span>
          <span style={{ color: muted, fontSize: 12 }}>{ticketsDeTrab.length} ticket{ticketsDeTrab.length !== 1 ? "s" : ""} en total</span>
        </div>
      )}

      {/* Lista de tickets */}
      {filtrar(listaMostrada).length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <p style={{ fontSize: 40 }}>{trabajadorSel ? "🗒️" : subVista === "sinAsignar" ? "✅" : subVista === "enCurso" ? "⚙️" : "📋"}</p>
          <p style={{ color: muted, fontSize: 14, fontWeight: 700 }}>
            {trabajadorSel ? `${trabSelObj?.nombre?.split(" ")[0]} no tiene tickets asignados` : subVista === "sinAsignar" ? "¡Todo asignado!" : subVista === "enCurso" ? "Sin tickets en curso" : "Sin completados"}
          </p>
        </div>
      ) : (
        <div className="tickets-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 14 }}>
          {filtrar(listaMostrada).map(t => {
            const asignadosEmp = (t.asignacionesPorEmpresa?.[miEmpId] || [])
              .map(id => USUARIOS.find(u => u.id === id))
              .filter(Boolean);
            const origen = EMPRESAS.find(e => e.id === t.empresaOrigenId);
            const vencido = t.fechaLimite && new Date(t.fechaLimite) < new Date() && !["Completado","Cancelado"].includes(t.estado);

            return (
              <div key={t.id} onClick={() => onVerTicket(t)}
                style={{ background: cardBg, border: `2px solid ${vencido ? "#E53E3E" : border}`, borderRadius: 12, padding: "14px 16px", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px #0002"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>

                {/* Origen y estado */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {origen && <span style={{ background: origen.color + "22", color: origen.color, borderRadius: 99, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>● {origen.nombre}</span>}
                    {vencido && <span style={{ background: "#E53E3E22", color: "#E53E3E", borderRadius: 99, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>⚠ VENCIDO</span>}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: t.estado === "Pendiente" ? "#718096" : t.estado === "Asignado" ? "#3182CE" : t.estado === "En progreso" ? "#D4A017" : "#38A169", background: (t.estado === "Pendiente" ? "#71809622" : t.estado === "Asignado" ? "#3182CE22" : t.estado === "En progreso" ? "#D4A01722" : "#38A16922"), borderRadius: 99, padding: "2px 8px" }}>
                    {t.estado}
                  </span>
                </div>

                {/* Título */}
                <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 14, color: textPri, lineHeight: 1.3 }}>{t.titulo}</p>

                {/* Asignados */}
                {asignadosEmp.length > 0 ? (
                  <div style={{ display: "flex", gap: 5, alignItems: "center", marginBottom: 8 }}>
                    {asignadosEmp.slice(0, 4).map(u => (
                      <div key={u.id} title={u.nombre}
                        style={{ width: 26, height: 26, borderRadius: "50%", background: empColor + "44", border: `2px solid ${empColor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: empColor }}>
                        {u.nombre.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                    ))}
                    {asignadosEmp.length > 4 && <span style={{ color: muted, fontSize: 11 }}>+{asignadosEmp.length - 4}</span>}
                  </div>
                ) : (
                  subVista === "sinAsignar" && (
                    <p style={{ margin: "0 0 8px", color: "#E53E3E", fontSize: 11, fontWeight: 600 }}>⚠ Sin asignar — pulsa para asignar</p>
                  )
                )}

                {/* Fecha límite */}
                {t.fechaLimite && (
                  <p style={{ margin: 0, color: vencido ? "#E53E3E" : muted, fontSize: 11 }}>
                    📅 Límite: {new Date(t.fechaLimite).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════════
// MÓDULOS RRHH — Daniel Pizarro
// ═══════════════════════════════════════════════════════════════════

// ── Gestión de Nóminas ──────────────────────────────────────────────
function GestionNominasRRHH({ darkMode, usuario, db, USUARIOS, EMPRESAS, empColor }) {
  const [nominas,      setNominas]      = useState([]);
  const [modalSubir,   setModalSubir]   = useState(false);
  const [filtroEmp,    setFiltroEmp]    = useState("todas");
  const [filtroUser,   setFiltroUser]   = useState("todos");
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "nominas"), snap => {
      setNominas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [db]);

  const dm = darkMode;
  const cardBg = dm ? "#111827" : "#FFFFFF";
  const border  = dm ? "#1E293B" : "#E2E8F0";
  const textPri = dm ? "#E2E8F0" : "#0F172A";
  const muted   = dm ? "#64748B" : "#94A3B8";

  const nominasFiltradas = nominas
    .filter(n => filtroEmp === "todas" || String(n.empresaId) === filtroEmp)
    .filter(n => filtroUser === "todos" || String(n.usuarioId) === filtroUser)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const usuariosFiltro = USUARIOS.filter(u =>
    filtroEmp === "todas" || String(u.empresaId) === filtroEmp
  );

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ margin:"0 0 4px", color:textPri, fontWeight:800, fontSize:20 }}>📋 Gestión de Nóminas</h2>
          <p style={{ margin:0, color:muted, fontSize:13 }}>Sube y gestiona las nóminas de todos los empleados</p>
        </div>
        <button onClick={() => setModalSubir(true)}
          style={{ fontFamily:"inherit", fontSize:13, fontWeight:700, padding:"9px 20px", borderRadius:8, border:"none", cursor:"pointer", background:empColor, color:"#fff" }}>
          + Subir Nómina
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }}>
        <select value={filtroEmp} onChange={e => { setFiltroEmp(e.target.value); setFiltroUser("todos"); }}
          style={{ height:34, padding:"0 10px", background:dm?"#1E293B":"#F8FAFC", border:`1px solid ${border}`, borderRadius:8, color:textPri, fontSize:12, fontFamily:"inherit", outline:"none" }}>
          <option value="todas">Todas las empresas</option>
          {EMPRESAS.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <select value={filtroUser} onChange={e => setFiltroUser(e.target.value)}
          style={{ height:34, padding:"0 10px", background:dm?"#1E293B":"#F8FAFC", border:`1px solid ${border}`, borderRadius:8, color:textPri, fontSize:12, fontFamily:"inherit", outline:"none" }}>
          <option value="todos">Todos los empleados</option>
          {usuariosFiltro.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
        </select>
      </div>

      {/* Lista nóminas */}
      {loading ? (
        <p style={{ color:muted, textAlign:"center", padding:40 }}>Cargando nóminas...</p>
      ) : nominasFiltradas.length === 0 ? (
        <div style={{ textAlign:"center", padding:"70px 20px" }}>
          <p style={{ fontSize:48, marginBottom:12 }}>💰</p>
          <p style={{ color:muted, fontSize:14, fontWeight:700 }}>No hay nóminas para este filtro</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {nominasFiltradas.map(n => {
            const usr = USUARIOS.find(u => u.id === n.usuarioId);
            const emp = EMPRESAS.find(e => e.id === n.empresaId);
            return (
              <div key={n.id} style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:10, padding:"14px 18px", display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:(emp?.color||empColor)+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>💰</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3, flexWrap:"wrap" }}>
                    <span style={{ fontWeight:700, fontSize:14, color:textPri }}>{usr?.nombre || "Usuario"}</span>
                    {emp && <span style={{ background:emp.color+"18", color:emp.color, borderRadius:4, padding:"1px 7px", fontSize:10, fontWeight:700 }}>{emp.nombre}</span>}
                  </div>
                  <span style={{ color:muted, fontSize:12 }}>
                    {n.mes || "—"} · Subida {n.fecha ? new Date(n.fecha).toLocaleDateString("es-ES") : "—"}
                  </span>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  {n.url && (
                    <a href={n.url} download={n.nombre || "nomina.pdf"} target="_blank" rel="noreferrer"
                      style={{ fontFamily:"inherit", fontSize:12, fontWeight:700, padding:"7px 14px", borderRadius:7, border:`1px solid ${empColor}`, color:empColor, textDecoration:"none", background:empColor+"11" }}>
                      ⬇ Descargar
                    </a>
                  )}
                  <button onClick={() => deleteDoc(doc(db, "nominas", n.id))}
                    style={{ fontFamily:"inherit", fontSize:12, padding:"7px 12px", borderRadius:7, border:`1px solid ${border}`, cursor:"pointer", background:"transparent", color:"#E53E3E" }}>
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal subir nómina */}
      {modalSubir && (
        <ModalSubirNominaRRHH
          darkMode={dm}
          db={db}
          USUARIOS={USUARIOS}
          EMPRESAS={EMPRESAS}
          empColor={empColor}
          onClose={() => setModalSubir(false)}
        />
      )}
    </div>
  );
}

function ModalSubirNominaRRHH({ darkMode, db, USUARIOS, EMPRESAS, empColor, onClose }) {
  const [empresaId, setEmpresaId] = useState("");
  const [usuarioId, setUsuarioId] = useState("");
  const [mes,       setMes]       = useState("");
  const [archivo,   setArchivo]   = useState(null);
  const [loading,   setLoading]   = useState(false);

  const dm = darkMode;
  const inp = { fontFamily:"inherit", fontSize:13, background:dm?"#1A2235":"#F8FAFC", border:`1px solid ${dm?"#2E3A55":"#CBD5E1"}`, borderRadius:7, padding:"9px 12px", color:dm?"#E2E8F0":"#0F172A", outline:"none", width:"100%", boxSizing:"border-box" };
  const label = { display:"block", color:dm?"#64748B":"#475569", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".4px", marginBottom:5 };

  const usuariosEmp = USUARIOS.filter(u => String(u.empresaId) === empresaId);

  const handleFile = e => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > MAX_ARCHIVO_BYTES) { alert("El archivo no puede superar los 700 KB."); return; }
    const reader = new FileReader();
    reader.onload = ev => setArchivo({ nombre: f.name, url: ev.target.result });
    reader.readAsDataURL(f);
  };

  const subir = async () => {
    if (!empresaId || !usuarioId || !mes || !archivo) return;
    setLoading(true);
    const id = "nom_" + Date.now();
    await setDoc(doc(db, "nominas", id), {
      id, usuarioId: Number(usuarioId), empresaId: Number(empresaId),
      mes, nombre: archivo.nombre, url: archivo.url,
      fecha: new Date().toISOString(), subidoPor: "rrhh",
    });
    setLoading(false);
    onClose();
  };

  const canSubmit = empresaId && usuarioId && mes && archivo;

  return (
    <div style={{ position:"fixed", inset:0, background:"#00000099", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20 }} onMouseDown={onClose}>
      <div style={{ background:dm?"#111827":"#FFFFFF", border:`1px solid ${dm?"#2E3A55":"#CBD5E1"}`, borderRadius:14, width:"100%", maxWidth:480, padding:28, boxShadow:"0 24px 80px #0008" }} onMouseDown={e => e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h2 style={{ margin:0, fontSize:17, fontWeight:800, color:dm?"#E2E8F0":"#0F172A" }}>💰 Subir Nómina</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#64748B", fontSize:22, cursor:"pointer" }}>×</button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={label}>Empresa *</label>
            <select style={inp} value={empresaId} onChange={e => { setEmpresaId(e.target.value); setUsuarioId(""); }}>
              <option value="">Selecciona empresa...</option>
              {EMPRESAS.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Empleado *</label>
            <select style={inp} value={usuarioId} onChange={e => setUsuarioId(e.target.value)} disabled={!empresaId}>
              <option value="">Selecciona empleado...</option>
              {usuariosEmp.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Mes *</label>
            <input type="month" style={{ ...inp, colorScheme:dm?"dark":"light" }} value={mes} onChange={e => setMes(e.target.value)} />
          </div>
          <div>
            <label style={label}>Archivo PDF *</label>
            {archivo ? (
              <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", background:dm?"#1E293B":"#F8FAFC", borderRadius:7, border:`1px solid ${dm?"#2E3A55":"#E2E8F0"}` }}>
                <span>📄</span>
                <span style={{ fontSize:12, color:dm?"#E2E8F0":"#0F172A", flex:1 }}>{archivo.nombre}</span>
                <button onClick={() => setArchivo(null)} style={{ background:"none", border:"none", color:"#E53E3E", cursor:"pointer", fontSize:16 }}>×</button>
              </div>
            ) : (
              <label style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 14px", background:dm?"#1E293B":"#F8FAFC", border:`1px solid ${dm?"#2E3A55":"#E2E8F0"}`, borderRadius:7, cursor:"pointer", fontSize:12, color:dm?"#94A3B8":"#64748B" }}>
                📎 Seleccionar PDF
                <input type="file" accept=".pdf" style={{ display:"none" }} onChange={handleFile} />
              </label>
            )}
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", paddingTop:6 }}>
            <button onClick={onClose} style={{ fontFamily:"inherit", fontSize:13, fontWeight:600, padding:"9px 18px", borderRadius:7, border:`1px solid ${dm?"#2E3A55":"#CBD5E1"}`, cursor:"pointer", background:"transparent", color:dm?"#94A3B8":"#475569" }}>Cancelar</button>
            <button onClick={subir} disabled={!canSubmit || loading}
              style={{ fontFamily:"inherit", fontSize:13, fontWeight:700, padding:"9px 20px", borderRadius:7, border:"none", cursor:canSubmit?"pointer":"not-allowed", background:empColor, color:"#fff", opacity:canSubmit?1:0.5 }}>
              {loading ? "Subiendo..." : "💰 Subir Nómina"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CRUD de Permisos (solo Administrador · Sara) ───────────────────
function SeccionPermisos({ db, darkMode, usuario, USUARIOS, EMPRESAS, empColor }) {
  const [permisos, setPermisos] = useState(null);
  const [modSel,   setModSel]   = useState(MODULOS_PERMISOS[0].id);
  const [empFiltro, setEmpFiltro] = useState("todas");
  const [buscar,   setBuscar]   = useState("");
  const [aviso,    setAviso]    = useState("");

  const dm = darkMode;
  const cardBg  = dm ? "#111827" : "#FFFFFF";
  const border  = dm ? "#1E293B" : "#E2E8F0";
  const textPri = dm ? "#E2E8F0" : "#0F172A";
  const muted   = dm ? "#64748B" : "#94A3B8";
  const bg2     = dm ? "#0D1424" : "#F8FAFC";
  const NIVEL_COL = { visualizacion: "#3182CE", creacion: "#D4A017", administracion: "#E53E3E" };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "permisos"), snap => {
      const fromDb = {};
      snap.docs.forEach(d => { fromDb[d.id] = d.data(); });
      const merged = {};
      MODULOS_PERMISOS.forEach(m => {
        merged[m.id] = {};
        m.niveles.forEach(nv => {
          merged[m.id][nv] = Array.isArray(fromDb[m.id]?.[nv]) ? fromDb[m.id][nv] : (PERMISOS_DEFAULT[m.id]?.[nv] || []);
        });
      });
      setPermisos(merged);
    });
    return unsub;
  }, [db]);

  if (!permisos) return <div style={{ padding: 40, color: muted }}>Cargando permisos...</div>;

  const modulo = MODULOS_PERMISOS.find(m => m.id === modSel);
  const perMod = permisos[modSel] || {};

  const toggle = async (nivel, uid) => {
    const set = new Set(perMod[nivel] || []);
    if (set.has(uid)) set.delete(uid); else set.add(uid);
    const nuevoMod = { ...perMod, [nivel]: [...set].sort((a, b) => a - b) };
    setPermisos(p => ({ ...p, [modSel]: nuevoMod }));
    try {
      await setDoc(doc(db, "permisos", modSel), nuevoMod);
      setAviso("Guardado ✓"); setTimeout(() => setAviso(""), 1200);
    } catch { setAviso("⚠️ Error al guardar"); }
  };

  const setTodos = async (nivel, activar) => {
    const ids = activar ? usuariosVisibles.map(u => u.id) : [];
    // combinar con los que no están visibles (para no borrar fuera del filtro)
    const fuera = (perMod[nivel] || []).filter(id => !usuariosVisibles.some(u => u.id === id));
    const nuevoMod = { ...perMod, [nivel]: [...new Set([...fuera, ...ids])].sort((a, b) => a - b) };
    setPermisos(p => ({ ...p, [modSel]: nuevoMod }));
    try { await setDoc(doc(db, "permisos", modSel), nuevoMod); setAviso("Guardado ✓"); setTimeout(() => setAviso(""), 1200); } catch {}
  };

  const usuariosVisibles = USUARIOS.filter(u =>
    (empFiltro === "todas" || String(u.empresaId) === empFiltro) &&
    (!buscar || u.nombre.toLowerCase().includes(buscar.toLowerCase()))
  );
  const empresasVis = EMPRESAS.filter(e => usuariosVisibles.some(u => u.empresaId === e.id));

  const tiene = (nivel, uid) => (perMod[nivel] || []).includes(uid);

  const modsPorGrupo = {};
  MODULOS_PERMISOS.forEach(m => { (modsPorGrupo[m.grupo] = modsPorGrupo[m.grupo] || []).push(m); });

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", color: textPri, fontWeight: 800, fontSize: 20 }}>🔐 Permisos y accesos</h2>
          <p style={{ margin: 0, color: muted, fontSize: 13 }}>Elige un módulo, un nivel y marca a quién se lo concedes</p>
        </div>
        {aviso && <span style={{ color: aviso.includes("⚠") ? "#E53E3E" : "#38A169", fontSize: 13, fontWeight: 700 }}>{aviso}</span>}
      </div>

      {/* Selector de módulo */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {MODULOS_PERMISOS.map(m => (
          <button key={m.id} onClick={() => setModSel(m.id)}
            style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${modSel === m.id ? empColor : border}`, background: modSel === m.id ? empColor + "18" : "transparent", color: modSel === m.id ? empColor : muted, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Descripción de niveles del módulo */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {modulo.niveles.map(nv => (
          <div key={nv} style={{ background: NIVEL_COL[nv] + "12", border: `1px solid ${NIVEL_COL[nv]}44`, borderRadius: 8, padding: "8px 12px" }}>
            <span style={{ color: NIVEL_COL[nv], fontWeight: 800, fontSize: 12 }}>{NIVELES_PERM[nv]}</span>
            <span style={{ color: muted, fontSize: 11 }}> — {modulo.desc[nv]}</span>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <select value={empFiltro} onChange={e => setEmpFiltro(e.target.value)}
          style={{ height: 34, padding: "0 10px", background: bg2, border: `1px solid ${border}`, borderRadius: 8, color: textPri, fontSize: 12, fontFamily: "inherit", outline: "none" }}>
          <option value="todas">Todas las empresas</option>
          {EMPRESAS.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <div style={{ position: "relative", flex: 1, minWidth: 180, maxWidth: 260 }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: muted, fontSize: 13 }}>🔍</span>
          <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar persona..."
            style={{ width: "100%", height: 34, paddingLeft: 30, paddingRight: 10, background: bg2, border: `1px solid ${border}`, borderRadius: 8, color: textPri, fontSize: 12, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
        </div>
      </div>

      {/* Cabecera de columnas + marcar todos */}
      <div style={{ display: "flex", alignItems: "center", padding: "8px 14px", background: bg2, borderRadius: "10px 10px 0 0", border: `1px solid ${border}`, borderBottom: "none", gap: 10 }}>
        <span style={{ flex: 1, color: muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Persona ({usuariosVisibles.length})</span>
        {modulo.niveles.map(nv => (
          <div key={nv} style={{ width: 92, textAlign: "center" }}>
            <div style={{ color: NIVEL_COL[nv], fontSize: 11, fontWeight: 800 }}>{NIVELES_PERM[nv]}</div>
            <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 2 }}>
              <span onClick={() => setTodos(nv, true)} style={{ cursor: "pointer", color: muted, fontSize: 9, textDecoration: "underline" }}>todos</span>
              <span onClick={() => setTodos(nv, false)} style={{ cursor: "pointer", color: muted, fontSize: 9, textDecoration: "underline" }}>ninguno</span>
            </div>
          </div>
        ))}
      </div>

      {/* Lista de usuarios agrupada por empresa */}
      <div style={{ border: `1px solid ${border}`, borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
        {empresasVis.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: muted, fontSize: 13 }}>Sin resultados</div>
        ) : empresasVis.flatMap(emp => {
          const us = usuariosVisibles.filter(u => u.empresaId === emp.id);
          return [
            <div key={"h" + emp.id} style={{ padding: "6px 14px", background: emp.color + "12", borderTop: `1px solid ${border}` }}>
              <span style={{ color: emp.color, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".4px" }}>{emp.nombre}</span>
            </div>,
            ...us.map(u => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", padding: "8px 14px", borderTop: `1px solid ${border}`, gap: 10, background: cardBg }}>
                <span style={{ flex: 1, color: textPri, fontSize: 13 }}>
                  {u.nombre} <span style={{ color: muted, fontSize: 11 }}>· {u.rol}</span>
                </span>
                {modulo.niveles.map(nv => (
                  <div key={nv} style={{ width: 92, display: "flex", justifyContent: "center" }}>
                    <input type="checkbox" checked={tiene(nv, u.id)} onChange={() => toggle(nv, u.id)}
                      style={{ width: 18, height: 18, cursor: "pointer", accentColor: NIVEL_COL[nv] }} />
                  </div>
                ))}
              </div>
            ))
          ];
        })}
      </div>

      <p style={{ margin: "12px 0 0", color: muted, fontSize: 11 }}>
        ℹ️ Los niveles son acumulativos: <b>Administración</b> incluye Creación y Visualización. Los cambios se guardan al instante.
      </p>
    </div>
  );
}

// ── Vacaciones (usuario): solicitar + control individual + aprobación encargado ──
const DIAS_VACACIONES_ANUALES = 22;

function contarLaborables(ini, fin) {
  const d0 = new Date(ini + "T12:00:00"), d1 = new Date(fin + "T12:00:00");
  if (isNaN(d0) || isNaN(d1) || d1 < d0) return 0;
  let count = 0; const d = new Date(d0);
  while (d <= d1) { const dow = d.getDay(); if (dow >= 1 && dow <= 5) count++; d.setDate(d.getDate() + 1); }
  return count;
}

function SeccionVacaciones({ db, darkMode, usuario, USUARIOS, EMPRESAS, empColor, esAprobador }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [modalNueva,  setModalNueva]  = useState(false);
  const [loading,     setLoading]     = useState(true);

  const dm = darkMode;
  const cardBg  = dm ? "#111827" : "#FFFFFF";
  const border  = dm ? "#1E293B" : "#E2E8F0";
  const textPri = dm ? "#E2E8F0" : "#0F172A";
  const muted   = dm ? "#64748B" : "#94A3B8";
  const bg2     = dm ? "#0D1424" : "#F8FAFC";
  const VERDE = "#38A169", ROJO = "#E53E3E", AMBAR = "#D4A017";

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "solicitudesRRHH"), snap => {
      setSolicitudes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [db]);

  const anio = new Date().getFullYear();
  const empresaTieneEncargado = empId => USUARIOS.some(u => u.rol === "encargado" && u.empresaId === empId);

  // ¿Quién aprueba las vacaciones de un solicitante?
  const aprobadoresDe = solicitanteId => {
    const s = USUARIOS.find(u => u.id === solicitanteId);
    if (!s) return [];
    const encs = USUARIOS.filter(u => u.rol === "encargado" && u.empresaId === s.empresaId && u.id !== solicitanteId);
    if (encs.length) return encs.map(u => u.id);
    // Empresa sin encargado (Independiente) → lo aprueba RRHH (Dani)
    return USUARIOS.filter(u => u.rol === "rrhh" && u.id !== solicitanteId).map(u => u.id);
  };

  // ¿Puede el usuario actual aprobar esta solicitud?
  const puedoAprobar = s => {
    if (s.usuarioId === usuario.id) return false;
    const sol = USUARIOS.find(u => u.id === s.usuarioId);
    if (!sol) return false;
    if (usuario.rol === "encargado") return sol.empresaId === usuario.empresaId;
    // RRHH (Dani) aprueba las de empresas sin encargado (Independiente)
    if (usuario.rol === "rrhh") return !empresaTieneEncargado(sol.empresaId);
    return false;
  };

  // Mis vacaciones
  const mias = solicitudes.filter(s => s.usuarioId === usuario.id && s.tipo === "vacaciones");
  const miasAnio = mias.filter(s => (s.fechaInicio || "").slice(0, 4) === String(anio));
  const diasUsados     = miasAnio.filter(s => s.estado === "aprobada").reduce((a, s) => a + (s.diasSolicitados || 0), 0);
  const diasPendientes = miasAnio.filter(s => s.estado === "pendiente").reduce((a, s) => a + (s.diasSolicitados || 0), 0);
  const diasRestantes  = Math.max(0, DIAS_VACACIONES_ANUALES - diasUsados);
  const pctUsado = Math.round(diasUsados / DIAS_VACACIONES_ANUALES * 100);

  // Solicitudes que debo aprobar
  const porAprobar = solicitudes.filter(s => s.tipo === "vacaciones" && s.estado === "pendiente" && puedoAprobar(s))
    .sort((a, b) => new Date(a.fechaCreacion) - new Date(b.fechaCreacion));

  const notif = (destinoId, texto, tipo) => {
    const id = "ntf_" + Date.now() + "_" + Math.floor(Math.random() * 99999);
    setDoc(doc(db, "notificaciones", id), { id, fecha: new Date().toISOString(), leida: false, usuarioDestinoId: destinoId, tipo, texto }).catch(() => {});
  };

  const resolver = async (s, estado) => {
    await updateDoc(doc(db, "solicitudesRRHH", s.id), { estado, encargadoId: usuario.id, fechaGestion: new Date().toISOString() });
    notif(s.usuarioId, `Tu solicitud de vacaciones (${s.fechaInicio} → ${s.fechaFin}) ha sido ${estado}.`, "vacaciones");
  };

  const ESTADO = { pendiente: { c: AMBAR, t: "⏳ Pendiente" }, aprobada: { c: VERDE, t: "✅ Aprobada" }, rechazada: { c: ROJO, t: "❌ Rechazada" } };
  const fmtFecha = f => f ? new Date(f + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", color: textPri, fontWeight: 800, fontSize: 20 }}>🏖️ Vacaciones</h2>
          <p style={{ margin: 0, color: muted, fontSize: 13 }}>Solicita tus vacaciones y controla los días que te quedan</p>
        </div>
        <button onClick={() => setModalNueva(true)}
          style={{ background: empColor, border: "none", borderRadius: 8, padding: "10px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          + Solicitar vacaciones
        </button>
      </div>

      {/* Resumen de días */}
      <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 14, padding: 20, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 34, fontWeight: 900, color: empColor, lineHeight: 1 }}>{diasRestantes}</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: textPri }}>de {DIAS_VACACIONES_ANUALES} días disponibles</span>
          <span style={{ marginLeft: "auto", color: muted, fontSize: 12 }}>Año {anio} · días laborables</span>
        </div>
        <div style={{ height: 12, borderRadius: 6, background: bg2, overflow: "hidden", display: "flex" }}>
          <div style={{ width: `${Math.min(100, pctUsado)}%`, background: VERDE }} title={`${diasUsados} usados`} />
          <div style={{ width: `${Math.min(100 - pctUsado, Math.round(diasPendientes / DIAS_VACACIONES_ANUALES * 100))}%`, background: AMBAR }} title={`${diasPendientes} pendientes`} />
        </div>
        <div style={{ display: "flex", gap: 18, marginTop: 12, flexWrap: "wrap" }}>
          {[["Disponibles", diasRestantes, empColor], ["Usados", diasUsados, VERDE], ["Pendientes", diasPendientes, AMBAR]].map(([l, v, c]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
              <span style={{ color: muted, fontSize: 12, fontWeight: 600 }}>{l}: <b style={{ color: textPri }}>{v}</b></span>
            </div>
          ))}
        </div>
      </div>

      {/* Solicitudes por aprobar (encargado / dir-ceo) */}
      {porAprobar.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ margin: "0 0 12px", color: textPri, fontWeight: 800, fontSize: 15 }}>
            📥 Solicitudes por aprobar <span style={{ color: AMBAR }}>({porAprobar.length})</span>
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {porAprobar.map(s => {
              const sol = USUARIOS.find(u => u.id === s.usuarioId);
              const emp = EMPRESAS.find(e => e.id === sol?.empresaId);
              return (
                <div key={s.id} style={{ background: cardBg, border: `1px solid ${AMBAR}55`, borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: textPri }}>{sol?.nombre}</span>
                      {emp && <span style={{ background: emp.color + "18", color: emp.color, borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>{emp.nombre}</span>}
                    </div>
                    <span style={{ color: muted, fontSize: 12 }}>📅 {fmtFecha(s.fechaInicio)} → {fmtFecha(s.fechaFin)} · <b style={{ color: textPri }}>{s.diasSolicitados} días</b></span>
                    {s.descripcion && <p style={{ margin: "4px 0 0", color: muted, fontSize: 12 }}>📝 {s.descripcion}</p>}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => resolver(s, "aprobada")} style={{ fontFamily: "inherit", fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer", background: VERDE, color: "#fff" }}>✅ Aprobar</button>
                    <button onClick={() => resolver(s, "rechazada")} style={{ fontFamily: "inherit", fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer", background: ROJO, color: "#fff" }}>❌ Rechazar</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mis solicitudes */}
      <h3 style={{ margin: "0 0 12px", color: textPri, fontWeight: 800, fontSize: 15 }}>Mis solicitudes</h3>
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: muted }}>Cargando...</div>
      ) : mias.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 20px", background: cardBg, border: `1px solid ${border}`, borderRadius: 12 }}>
          <p style={{ fontSize: 44, margin: "0 0 8px" }}>🏝️</p>
          <p style={{ color: muted, fontSize: 14, fontWeight: 700, margin: 0 }}>Aún no has solicitado vacaciones</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[...mias].sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion)).map(s => {
            const est = ESTADO[s.estado] || ESTADO.pendiente;
            return (
              <div key={s.id} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: est.c + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🏖️</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: "0 0 2px", color: textPri, fontSize: 14, fontWeight: 700 }}>{fmtFecha(s.fechaInicio)} → {fmtFecha(s.fechaFin)}</p>
                  <span style={{ color: muted, fontSize: 12 }}>{s.diasSolicitados} días laborables{s.descripcion ? ` · ${s.descripcion}` : ""}</span>
                </div>
                <span style={{ background: est.c + "22", color: est.c, border: `1px solid ${est.c}55`, borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{est.t}</span>
              </div>
            );
          })}
        </div>
      )}

      {modalNueva && (
        <ModalNuevaVacacion
          db={db} dm={dm} usuario={usuario} empColor={empColor}
          diasRestantes={diasRestantes}
          aprobadoresDe={aprobadoresDe}
          esAprobador={esAprobador}
          misSolicitudes={mias.filter(s => s.estado !== "rechazada")}
          onNotif={notif}
          onClose={() => setModalNueva(false)}
        />
      )}
    </div>
  );
}

function ModalNuevaVacacion({ db, dm, usuario, empColor, diasRestantes, aprobadoresDe, esAprobador, misSolicitudes, onNotif, onClose }) {
  const hoyStr = new Date().toISOString().split("T")[0];
  const [ini, setIni] = useState(hoyStr);
  const [fin, setFin] = useState(hoyStr);
  const [desc, setDesc] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const card = dm ? "#111827" : "#FFFFFF", border = dm ? "#2E3A55" : "#E2E8F0", text = dm ? "#E2E8F0" : "#0F172A", muted = dm ? "#64748B" : "#94A3B8";
  const inp = { fontFamily: "inherit", fontSize: 13, background: dm ? "#1A2235" : "#F8FAFC", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: text, outline: "none", width: "100%", boxSizing: "border-box", colorScheme: dm ? "dark" : "light" };
  const lbl = { display: "block", color: muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 };

  const dias = contarLaborables(ini, fin);

  const guardar = async () => {
    if (!ini || !fin) { setError("Selecciona las fechas."); return; }
    if (fin < ini) { setError("La fecha de fin debe ser posterior al inicio."); return; }
    if (ini < hoyStr) { setError("No puedes solicitar días en el pasado."); return; }
    if (dias === 0) { setError("El rango seleccionado no tiene días laborables."); return; }
    if (dias > diasRestantes) { setError(`Solo te quedan ${diasRestantes} días disponibles y estás pidiendo ${dias}.`); return; }
    const solapa = (misSolicitudes || []).find(s => ini <= s.fechaFin && fin >= s.fechaInicio);
    if (solapa) { setError(`Ya tienes vacaciones ${solapa.estado === "aprobada" ? "aprobadas" : "solicitadas"} del ${solapa.fechaInicio} al ${solapa.fechaFin}. Esas fechas se solapan.`); return; }
    setGuardando(true);
    try {
      const id = "sol_" + Date.now();
      const autoAprob = !!esAprobador; // el responsable (encargado/dir/ceo) se auto-aprueba
      await setDoc(doc(db, "solicitudesRRHH", id), {
        id, usuarioId: usuario.id, tipo: "vacaciones",
        fechaInicio: ini, fechaFin: fin, diasSolicitados: dias,
        descripcion: desc.trim() || null,
        estado: autoAprob ? "aprobada" : "pendiente",
        ...(autoAprob ? { encargadoId: usuario.id, fechaGestion: new Date().toISOString() } : {}),
        fechaCreacion: new Date().toISOString(),
      });
      if (!autoAprob) {
        aprobadoresDe(usuario.id).forEach(aid => onNotif(aid, `${usuario.nombre} ha solicitado vacaciones (${ini} → ${fin}, ${dias} días).`, "vacaciones"));
      }
      onClose();
    } catch (e) {
      setError("Error al enviar la solicitud. Inténtalo de nuevo.");
    } finally { setGuardando(false); }
  };

  return (
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, background: "#00000099", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div onMouseDown={e => e.stopPropagation()} style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, width: "100%", maxWidth: 440, padding: 26, boxShadow: "0 24px 80px #0009" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, color: text, fontSize: 17, fontWeight: 800 }}>🏖️ Solicitar vacaciones</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: muted, fontSize: 22, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>📅 Desde</label><input type="date" style={inp} value={ini} min={hoyStr} onChange={e => { setIni(e.target.value); if (fin < e.target.value) setFin(e.target.value); setError(""); }} /></div>
            <div><label style={lbl}>📅 Hasta</label><input type="date" style={inp} value={fin} min={ini} onChange={e => { setFin(e.target.value); setError(""); }} /></div>
          </div>
          <div><label style={lbl}>📝 Motivo (opcional)</label><input style={inp} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ej: viaje familiar" maxLength={120} /></div>

          <div style={{ background: empColor + "11", border: `1px solid ${empColor}33`, borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ color: muted, fontSize: 12, fontWeight: 600 }}>Días laborables solicitados</span>
            <span style={{ color: empColor, fontSize: 15, fontWeight: 800 }}>{dias}</span>
          </div>
          <p style={{ margin: 0, color: muted, fontSize: 11 }}>Te quedan <b style={{ color: text }}>{diasRestantes}</b> días disponibles este año.</p>

          {esAprobador && (
            <div style={{ background: "#38A16912", border: "1px solid #38A16944", borderRadius: 8, padding: "9px 12px", color: "#38A169", fontSize: 12, fontWeight: 600 }}>
              ✅ Como responsable, tus vacaciones se aprueban automáticamente.
            </div>
          )}

          {error && <p style={{ margin: 0, color: "#E53E3E", fontSize: 12, fontWeight: 600 }}>⚠️ {error}</p>}

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, fontFamily: "inherit", fontSize: 13, fontWeight: 700, padding: 10, borderRadius: 8, border: `1px solid ${border}`, cursor: "pointer", background: "transparent", color: muted }}>Cancelar</button>
            <button onClick={guardar} disabled={guardando} style={{ flex: 2, fontFamily: "inherit", fontSize: 13, fontWeight: 800, padding: 10, borderRadius: 8, border: "none", cursor: guardando ? "default" : "pointer", background: guardando ? empColor + "88" : empColor, color: "#fff" }}>
              {guardando ? "Enviando..." : esAprobador ? "✓ Confirmar vacaciones" : "✓ Enviar solicitud"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Gestión de Vacaciones ───────────────────────────────────────────
function GestionVacacionesRRHH({ darkMode, usuario, db, USUARIOS, EMPRESAS, empColor }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [empActiva,   setEmpActiva]   = useState("todas");
  const [detalle,     setDetalle]     = useState(null); // usuario (objeto u) seleccionado

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "solicitudesRRHH"), snap => {
      setSolicitudes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [db]);

  const dm = darkMode;
  const cardBg  = dm ? "#111827" : "#FFFFFF";
  const border  = dm ? "#1E293B" : "#E2E8F0";
  const textPri = dm ? "#E2E8F0" : "#0F172A";
  const muted   = dm ? "#64748B" : "#94A3B8";
  const bg2     = dm ? "#0D1424" : "#F8FAFC";
  const VERDE = "#38A169", ROJO = "#E53E3E", AMBAR = "#D4A017";
  const anio = new Date().getFullYear();

  // Saldo de vacaciones de un usuario (año en curso)
  const datosUsuario = u => {
    const mis = solicitudes.filter(s => s.usuarioId === u.id && s.tipo === "vacaciones");
    const misAnio = mis.filter(s => (s.fechaInicio || "").slice(0, 4) === String(anio));
    const gastados    = misAnio.filter(s => s.estado === "aprobada").reduce((a, s) => a + (s.diasSolicitados || 0), 0);
    const pendientes  = misAnio.filter(s => s.estado === "pendiente").reduce((a, s) => a + (s.diasSolicitados || 0), 0);
    const restantes   = Math.max(0, DIAS_VACACIONES_ANUALES - gastados);
    return { mis, misAnio, gastados, pendientes, restantes };
  };

  const empresasConEmpleados = EMPRESAS.filter(e => USUARIOS.some(u => u.empresaId === e.id));

  const fmtFecha = f => f ? new Date(f + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const ESTADO = { pendiente: { c: AMBAR, t: "⏳ Pendiente" }, aprobada: { c: VERDE, t: "✅ Aprobada" }, rechazada: { c: ROJO, t: "❌ Rechazada" } };

  const tabBtn = (id, label, activo) => (
    <button key={id} onClick={() => setEmpActiva(id)}
      style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${activo ? empColor : border}`, background: activo ? empColor + "18" : "transparent", color: activo ? empColor : muted, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
      {label}
    </button>
  );

  const PersonaCard = u => {
    const emp = EMPRESAS.find(e => e.id === u.empresaId);
    const { gastados, pendientes, restantes } = datosUsuario(u);
    const pct = Math.round(gastados / DIAS_VACACIONES_ANUALES * 100);
    const ini = u.nombre.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    return (
      <div key={u.id} onClick={() => setDetalle(u)}
        style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: 16, cursor: "pointer", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: (emp?.color || "#888") + "22", border: `1.5px solid ${emp?.color || "#888"}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: emp?.color || "#888", fontSize: 12, flexShrink: 0 }}>{ini}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, color: textPri, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.nombre}</p>
            <p style={{ margin: 0, color: muted, fontSize: 11 }}>{u.rol}</p>
          </div>
        </div>
        <div style={{ height: 8, borderRadius: 5, background: bg2, overflow: "hidden", display: "flex" }}>
          <div style={{ width: `${Math.min(100, pct)}%`, background: VERDE }} />
          <div style={{ width: `${Math.min(100 - pct, Math.round(pendientes / DIAS_VACACIONES_ANUALES * 100))}%`, background: AMBAR }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", textAlign: "center" }}>
          <div><div style={{ fontSize: 16, fontWeight: 900, color: restantes <= 3 ? ROJO : VERDE }}>{restantes}</div><div style={{ fontSize: 10, color: muted, fontWeight: 700 }}>Restantes</div></div>
          <div><div style={{ fontSize: 16, fontWeight: 900, color: textPri }}>{gastados}</div><div style={{ fontSize: 10, color: muted, fontWeight: 700 }}>Gastados</div></div>
          <div><div style={{ fontSize: 16, fontWeight: 900, color: pendientes ? AMBAR : muted }}>{pendientes}</div><div style={{ fontSize: 10, color: muted, fontWeight: 700 }}>Pendientes</div></div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: "0 0 4px", color: textPri, fontWeight: 800, fontSize: 20 }}>🏖️ Gestión de Vacaciones</h2>
        <p style={{ margin: 0, color: muted, fontSize: 13 }}>Control de vacaciones por empresa · {DIAS_VACACIONES_ANUALES} días/año · {anio}</p>
      </div>

      {/* Tabs por empresa */}
      <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
        {tabBtn("todas", "Todas", empActiva === "todas")}
        {empresasConEmpleados.map(e => tabBtn(String(e.id), e.nombre, empActiva === String(e.id)))}
      </div>

      {/* Vista por empresa */}
      {empActiva === "todas"
        ? empresasConEmpleados.flatMap(emp => {
            const us = USUARIOS.filter(u => u.empresaId === emp.id);
            if (!us.length) return [];
            return [
              <div key={"grp_" + emp.id} style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: emp.color }} />
                  <span style={{ color: emp.color, fontWeight: 800, fontSize: 12, textTransform: "uppercase", letterSpacing: ".5px" }}>{emp.nombre}</span>
                  <span style={{ color: muted, fontSize: 11 }}>· {us.length} personas</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 14 }}>
                  {us.map(PersonaCard)}
                </div>
              </div>
            ];
          })
        : (() => {
            const emp = EMPRESAS.find(e => String(e.id) === empActiva);
            const us = USUARIOS.filter(u => String(u.empresaId) === empActiva);
            return (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 14 }}>
                {us.map(PersonaCard)}
              </div>
            );
          })()
      }

      {/* Modal detalle persona */}
      {detalle && (() => {
        const u = detalle;
        const emp = EMPRESAS.find(e => e.id === u.empresaId);
        const { mis, gastados, pendientes, restantes } = datosUsuario(u);
        const periodos = [...mis].sort((a, b) => String(b.fechaInicio).localeCompare(String(a.fechaInicio)));
        const ini = u.nombre.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
        return (
          <div onMouseDown={() => setDetalle(null)} style={{ position: "fixed", inset: 0, background: "#00000099", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
            <div onMouseDown={e => e.stopPropagation()} style={{ background: cardBg, border: `1px solid ${dm ? "#2E3A55" : "#E2E8F0"}`, borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "88vh", overflow: "auto", padding: 24, boxShadow: "0 24px 80px #0009" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <div style={{ width: 46, height: 46, borderRadius: "50%", background: (emp?.color || "#888") + "22", border: `2px solid ${emp?.color || "#888"}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: emp?.color || "#888", fontSize: 15, flexShrink: 0 }}>{ini}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: 0, color: textPri, fontSize: 16, fontWeight: 800 }}>{u.nombre}</h3>
                  <p style={{ margin: 0, color: muted, fontSize: 12 }}>{u.rol}{emp ? ` · ${emp.nombre}` : ""}</p>
                </div>
                <button onClick={() => setDetalle(null)} style={{ background: "none", border: "none", color: muted, fontSize: 24, cursor: "pointer" }}>×</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 18 }}>
                {[["Restantes", restantes, restantes <= 3 ? ROJO : VERDE], ["Gastados", gastados, textPri], ["Pendientes", pendientes, pendientes ? AMBAR : muted]].map(([l, v, c]) => (
                  <div key={l} style={{ background: bg2, borderRadius: 10, padding: "12px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: c }}>{v}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: muted, marginTop: 2 }}>{l} <span style={{ opacity: .7 }}>/ {DIAS_VACACIONES_ANUALES}</span></div>
                  </div>
                ))}
              </div>

              <h4 style={{ margin: "0 0 8px", color: textPri, fontSize: 13, fontWeight: 800 }}>Días de vacaciones</h4>
              {periodos.length === 0 ? (
                <div style={{ padding: 18, textAlign: "center", color: muted, fontSize: 13, background: bg2, borderRadius: 10 }}>Sin vacaciones registradas</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {periodos.map(s => {
                    const est = ESTADO[s.estado] || ESTADO.pendiente;
                    return (
                      <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: bg2, borderRadius: 8, flexWrap: "wrap" }}>
                        <span style={{ width: 9, height: 9, borderRadius: "50%", background: est.c, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 140 }}>
                          <span style={{ color: textPri, fontSize: 13, fontWeight: 700 }}>{fmtFecha(s.fechaInicio)} → {fmtFecha(s.fechaFin)}</span>
                          <span style={{ color: muted, fontSize: 12 }}> · {s.diasSolicitados} días</span>
                          {s.descripcion && <p style={{ margin: "2px 0 0", color: muted, fontSize: 11 }}>📝 {s.descripcion}</p>}
                        </div>
                        <span style={{ background: est.c + "22", color: est.c, border: `1px solid ${est.c}55`, borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{est.t}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Modal: registrar/editar un fichaje manualmente (RRHH) ──────────
function ModalFichajeManual({ db, dm, USUARIOS, EMPRESAS, empColor, fichaje, empleadoFijo, onClose }) {
  const esEdicion = !!fichaje;
  const card = dm ? "#111827" : "#FFFFFF", border = dm ? "#2E3A55" : "#E2E8F0", text = dm ? "#E2E8F0" : "#0F172A", muted = dm ? "#64748B" : "#94A3B8";
  const inp = { fontFamily: "inherit", fontSize: 13, background: dm ? "#1A2235" : "#F8FAFC", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: text, outline: "none", width: "100%", boxSizing: "border-box", colorScheme: dm ? "dark" : "light" };
  const lbl = { display: "block", color: muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 };

  const iniFecha = fichaje ? (fichaje.fecha || (fichaje.entrada || "").split("T")[0]) : new Date().toISOString().split("T")[0];
  const hhmm = iso => { if (!iso) return ""; const d = new Date(iso); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

  const [empId, setEmpId]   = useState(fichaje ? fichaje.usuarioId : (empleadoFijo != null ? empleadoFijo : ""));
  const [fecha, setFecha]   = useState(iniFecha);
  const [hEnt, setHEnt]     = useState(fichaje ? hhmm(fichaje.entrada) : "08:00");
  const [hSal, setHSal]     = useState(fichaje && fichaje.salida ? hhmm(fichaje.salida) : "15:00");
  const [error, setError]   = useState("");
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    if (empId === "" || empId == null) { setError("Selecciona un empleado."); return; }
    if (!fecha || !hEnt) { setError("Indica fecha y hora de entrada."); return; }
    const [Y, M, D] = fecha.split("-").map(Number);
    const [eh, em] = hEnt.split(":").map(Number);
    const entradaISO = new Date(Y, M - 1, D, eh, em).toISOString();
    let salidaISO = null;
    if (hSal) {
      const [sh, sm] = hSal.split(":").map(Number);
      salidaISO = new Date(Y, M - 1, D, sh, sm).toISOString();
      if (new Date(salidaISO) <= new Date(entradaISO)) { setError("La salida debe ser posterior a la entrada."); return; }
    }
    setGuardando(true);
    try {
      const uid = Number(empId);
      const id = esEdicion ? fichaje.id : `fic_${uid}_${Date.now()}`;
      await setDoc(doc(db, "fichajes", id), { id, usuarioId: uid, entrada: entradaISO, salida: salidaISO, fecha });
      onClose();
    } catch (e) { setError("Error al guardar."); } finally { setGuardando(false); }
  };

  const eliminar = async () => {
    if (!esEdicion) return;
    if (!window.confirm("¿Eliminar este fichaje?")) return;
    try { await deleteDoc(doc(db, "fichajes", fichaje.id)); onClose(); } catch {}
  };

  return (
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, background: "#00000099", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 20 }}>
      <div onMouseDown={e => e.stopPropagation()} style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, width: "100%", maxWidth: 440, padding: 26, boxShadow: "0 24px 80px #0009" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, color: text, fontSize: 17, fontWeight: 800 }}>🕐 {esEdicion ? "Editar fichaje" : "Registrar fichaje"}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: muted, fontSize: 22, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={lbl}>👤 Empleado</label>
            <select style={inp} value={empId} onChange={e => setEmpId(e.target.value)} disabled={esEdicion || empleadoFijo != null}>
              <option value="">Selecciona…</option>
              {EMPRESAS.map(emp => (
                <optgroup key={emp.id} label={emp.nombre}>
                  {USUARIOS.filter(u => u.empresaId === emp.id && !["director","ceo"].includes(u.rol)).map(u => (
                    <option key={u.id} value={u.id}>{u.nombre}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>📅 Fecha</label>
            <input type="date" style={inp} value={fecha} onChange={e => { setFecha(e.target.value); setError(""); }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>⏰ Entrada</label><input type="time" style={inp} value={hEnt} onChange={e => { setHEnt(e.target.value); setError(""); }} /></div>
            <div><label style={lbl}>⏰ Salida <span style={{ textTransform: "none", fontWeight: 400 }}>(opcional)</span></label><input type="time" style={inp} value={hSal} onChange={e => { setHSal(e.target.value); setError(""); }} /></div>
          </div>
          {error && <p style={{ margin: 0, color: "#E53E3E", fontSize: 12, fontWeight: 600 }}>⚠️ {error}</p>}
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            {esEdicion && <button onClick={eliminar} style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 700, padding: "10px 14px", borderRadius: 8, border: "1px solid #E53E3E44", cursor: "pointer", background: "#E53E3E18", color: "#E53E3E" }}>🗑️</button>}
            <button onClick={onClose} style={{ flex: 1, fontFamily: "inherit", fontSize: 13, fontWeight: 700, padding: 10, borderRadius: 8, border: `1px solid ${border}`, cursor: "pointer", background: "transparent", color: muted }}>Cancelar</button>
            <button onClick={guardar} disabled={guardando} style={{ flex: 2, fontFamily: "inherit", fontSize: 13, fontWeight: 800, padding: 10, borderRadius: 8, border: "none", cursor: "pointer", background: guardando ? empColor + "88" : empColor, color: "#fff" }}>{guardando ? "Guardando…" : "✓ Guardar"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Gestión de Fichajes ─────────────────────────────────────────────
function GestionFichajesRRHH({ darkMode, usuario, db, USUARIOS, EMPRESAS, empColor }) {
  const [fichajes,  setFichajes]  = useState([]);
  const [vacaciones, setVacaciones] = useState([]); // aprobadas
  const [periodo,   setPeriodo]   = useState("dia");
  const [fechaRef,  setFechaRef]  = useState(new Date().toISOString().split("T")[0]);
  const [empActiva, setEmpActiva] = useState("todas");
  const [detalle,   setDetalle]   = useState(null);
  const [modalManual, setModalManual] = useState(null); // {} = nuevo · {fichaje} = editar

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "fichajes"), snap => {
      const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Auto-desfichaje a las 15:00 de todos los que sigan abiertos
      todos.forEach(f => {
        if (!f.salida) {
          const sal = salidaAutomatica(f);
          if (sal) updateDoc(doc(db, "fichajes", f.id), { salida: sal }).catch(() => {});
        }
      });
      setFichajes(todos);
    });
    return unsub;
  }, [db]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "solicitudesRRHH"), snap => {
      setVacaciones(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => s.tipo === "vacaciones" && s.estado === "aprobada"));
    });
    return unsub;
  }, [db]);

  const dm      = darkMode;
  const border  = dm ? "#1E293B" : "#E2E8F0";
  const textPri = dm ? "#E2E8F0" : "#0F172A";
  const muted   = dm ? "#64748B" : "#94A3B8";
  const cardBg  = dm ? "#111827" : "#FFFFFF";
  const bg2     = dm ? "#0D1424" : "#F8FAFC";

  const fmtTime  = iso => iso ? new Date(iso).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"}) : null;
  const calcMins = f => f.salida ? Math.max(0,Math.round((new Date(f.salida)-new Date(f.entrada))/60000)) : null;
  const fmtHoras = m => { if(!m&&m!==0)return null; const h=Math.floor(m/60),min=m%60; return h>0?`${h}h${min>0?` ${min}min`:""}`:min>0?`${min}min`:"0min"; };

  // Rango de fechas
  const getRango = () => {
    const ref = new Date(fechaRef + "T12:00:00");
    if (periodo === "dia") return { desde:fechaRef, hasta:fechaRef };
    if (periodo === "semana") {
      const dow = ref.getDay();
      const lun = new Date(ref); lun.setDate(ref.getDate()-(dow===0?6:dow-1));
      const dom = new Date(lun); dom.setDate(lun.getDate()+6);
      return { desde:lun.toISOString().split("T")[0], hasta:dom.toISOString().split("T")[0] };
    }
    if (periodo === "mes") {
      const y=ref.getFullYear(),m=ref.getMonth();
      return { desde:`${y}-${String(m+1).padStart(2,"0")}-01`, hasta:new Date(y,m+1,0).toISOString().split("T")[0] };
    }
    const y=ref.getFullYear();
    return { desde:`${y}-01-01`, hasta:`${y}-12-31` };
  };

  const rango = getRango();

  const navegar = dir => {
    const ref = new Date(fechaRef+"T12:00:00");
    if(periodo==="dia") ref.setDate(ref.getDate()+dir);
    else if(periodo==="semana") ref.setDate(ref.getDate()+dir*7);
    else if(periodo==="mes") ref.setMonth(ref.getMonth()+dir);
    else ref.setFullYear(ref.getFullYear()+dir);
    setFechaRef(ref.toISOString().split("T")[0]);
  };

  const rangoLabel = () => {
    const ref = new Date(fechaRef+"T12:00:00");
    if(periodo==="dia") return ref.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"});
    if(periodo==="semana"){const r=getRango();return `${new Date(r.desde+"T12:00:00").toLocaleDateString("es-ES",{day:"numeric",month:"short"})} — ${new Date(r.hasta+"T12:00:00").toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"numeric"})}`;}
    if(periodo==="mes") return ref.toLocaleDateString("es-ES",{month:"long",year:"numeric"});
    return `Año ${ref.getFullYear()}`;
  };

  // Fichajes del periodo filtrados
  const fichajesPeriodo = fichajes.filter(f => {
    const fecha = f.fecha || f.entrada?.split("T")[0];
    return fecha >= rango.desde && fecha <= rango.hasta;
  });

  // Empleados a mostrar (excluir director/ceo)
  const empleados = USUARIOS
    .filter(u => !["director","ceo"].includes(u.rol))
    .filter(u => empActiva === "todas" || String(u.empresaId) === empActiva);

  // Datos por empleado en el periodo
  const datosEmpleado = empleados.map(u => {
    const emp = EMPRESAS.find(e => e.id === u.empresaId);
    const misF = fichajesPeriodo.filter(f => f.usuarioId === u.id);
    const misVac = vacaciones.filter(v => v.usuarioId === u.id).map(v => ({ fechaInicio: v.fechaInicio, fechaFin: v.fechaFin }));
    const activoAhora = fichajes.some(f => f.usuarioId === u.id && !f.salida);
    const totalMins = misF.reduce((acc,f) => acc + (calcMins(f)||0), 0);
    // Para vista día: último fichaje
    const ultimoFichaje = misF.sort((a,b)=>new Date(b.entrada)-new Date(a.entrada))[0];
    return { u, emp, misF, misVac, activoAhora, totalMins, ultimoFichaje };
  });

  // KPIs (sin contar inactivos)
  const activos    = datosEmpleado.filter(d => d.u.activo !== false);
  const fichados   = activos.filter(d => d.activoAhora).length;
  const hanFichado = activos.filter(d => d.misF.length > 0).length;
  const sinFichar  = activos.filter(d => d.misF.length === 0).length;
  const totalHoras = activos.reduce((acc,d) => acc+d.totalMins, 0);

  // Empresas para tabs
  const empresasConEmpleados = EMPRESAS.filter(e =>
    USUARIOS.some(u => u.empresaId === e.id && !["director","ceo"].includes(u.rol))
  );

  return (
    <div style={{ maxWidth:1200 }}>
      {/* Cabecera */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ margin:"0 0 4px", color:textPri, fontWeight:800, fontSize:20 }}>🕐 Gestión de Fichajes</h2>
          <p style={{ margin:0, color:muted, fontSize:13 }}>Control de presencia por empresa y periodo</p>
        </div>
        <button onClick={() => setModalManual({})}
          style={{ background: empColor, border:"none", borderRadius:8, padding:"10px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
          + Registrar fichaje
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:22 }}>
        {[
          { icon:"🟢", label:"Fichados ahora",   v:fichados,              color:"#38A169" },
          { icon:"✅", label:"Han fichado",       v:hanFichado,            color:"#3182CE" },
          { icon:"❌", label:"Sin fichar hoy",    v:sinFichar,             color:"#E53E3E" },
          { icon:"⏱️", label:"Horas totales",     v:fmtHoras(totalHoras)||"0h", color:"#805AD5", str:true },
        ].map((k,i)=>(
          <div key={i} style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:12, padding:"14px 18px", display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:42, height:42, borderRadius:10, background:k.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{k.icon}</div>
            <div>
              <div style={{ fontSize:k.str?16:24, fontWeight:900, color:k.color, lineHeight:1 }}>{k.v}</div>
              <div style={{ color:muted, fontSize:11, fontWeight:700, marginTop:3 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Controles periodo */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ display:"flex", gap:2, background:dm?"#1E293B":"#F1F5F9", borderRadius:8, padding:3 }}>
          {[["dia","Día"],["semana","Semana"],["mes","Mes"],["anio","Año"]].map(([v,l])=>(
            <button key={v} onClick={()=>setPeriodo(v)}
              style={{ fontFamily:"inherit", fontSize:12, fontWeight:600, padding:"5px 12px", borderRadius:6, border:"none", cursor:"pointer", background:periodo===v?empColor:"transparent", color:periodo===v?"#fff":(dm?"#64748B":"#94A3B8") }}>
              {l}
            </button>
          ))}
        </div>
        <button onClick={()=>navegar(-1)} style={{ width:32, height:32, borderRadius:8, border:`1px solid ${border}`, background:"transparent", cursor:"pointer", color:textPri, fontSize:18 }}>‹</button>
        <span style={{ color:textPri, fontSize:13, fontWeight:600, minWidth:220, textAlign:"center" }}>{rangoLabel()}</span>
        <button onClick={()=>navegar(1)} style={{ width:32, height:32, borderRadius:8, border:`1px solid ${border}`, background:"transparent", cursor:"pointer", color:textPri, fontSize:18 }}>›</button>
        <button onClick={()=>setFechaRef(new Date().toISOString().split("T")[0])}
          style={{ height:32, padding:"0 14px", background:empColor+"22", border:`1px solid ${empColor}44`, borderRadius:8, color:empColor, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
          Hoy
        </button>
      </div>

      {/* Tabs por empresa */}
      <div style={{ display:"flex", gap:4, marginBottom:20, flexWrap:"wrap" }}>
        <button onClick={()=>setEmpActiva("todas")}
          style={{ fontFamily:"inherit", fontSize:12, fontWeight:600, padding:"6px 16px", borderRadius:99, border:`1px solid ${empActiva==="todas"?empColor:border}`, cursor:"pointer", background:empActiva==="todas"?empColor+"22":"transparent", color:empActiva==="todas"?empColor:(dm?"#64748B":"#94A3B8") }}>
          🏢 Todas
        </button>
        {empresasConEmpleados.map(e=>(
          <button key={e.id} onClick={()=>setEmpActiva(String(e.id))}
            style={{ fontFamily:"inherit", fontSize:12, fontWeight:600, padding:"6px 16px", borderRadius:99, border:`1px solid ${empActiva===String(e.id)?e.color:border}`, cursor:"pointer", background:empActiva===String(e.id)?e.color+"22":"transparent", color:empActiva===String(e.id)?e.color:(dm?"#64748B":"#94A3B8"), display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background:e.color, flexShrink:0 }} />
            {e.nombre.split(" ")[0]}
          </button>
        ))}
      </div>

      {/* Leyenda */}
      <div style={{ display:"flex", gap:18, justifyContent:"center", marginBottom:18, flexWrap:"wrap" }}>
        {[["#38A169","Fichado"],["#E53E3E","Sin fichar"],["#805AD5","Vacaciones"],[dm?"#1E293B":"#E5E9F0","No laborable"],[dm?"#152036":"#EEF2F6","Aún no"]].map(([c,l])=>(
          <div key={l} style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ width:12, height:12, borderRadius:3, background:c, border:`1px solid ${c}`, flexShrink:0 }} />
            <span style={{ color:muted, fontSize:12, fontWeight:600 }}>{l}</span>
          </div>
        ))}
      </div>

      {/* Roscos por persona (el anillo = línea de tiempo del periodo) */}
      {datosEmpleado.length === 0 ? null : empActiva === "todas" ? (
        empresasConEmpleados.flatMap(emp => {
          const datos = datosEmpleado.filter(d => d.emp?.id === emp.id);
          if (!datos.length) return [];
          return [
            <div key={"grp_"+emp.id} style={{ marginBottom:22 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                <span style={{ width:10, height:10, borderRadius:"50%", background:emp.color }} />
                <span style={{ color:emp.color, fontWeight:800, fontSize:12, textTransform:"uppercase", letterSpacing:".5px" }}>{emp.nombre}</span>
                <span style={{ color:muted, fontSize:11 }}>· {datos.filter(d=>d.misF.length>0).length}/{datos.length} han fichado</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(190px, 1fr))", gap:14 }}>
                {datos.map(d => <RoscoFichaje key={d.u.id} u={d.u} emp={emp} misF={d.misF} vacaciones={d.misVac} inactivo={d.u.activo === false} periodo={periodo} rango={rango} fechaRef={fechaRef} dm={dm} size={190} onClick={() => setDetalle(d)} />)}
              </div>
            </div>
          ];
        })
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(190px, 1fr))", gap:14, marginBottom:26 }}>
          {datosEmpleado.map(d => <RoscoFichaje key={d.u.id} u={d.u} emp={d.emp} misF={d.misF} vacaciones={d.misVac} inactivo={d.u.activo === false} periodo={periodo} rango={rango} fechaRef={fechaRef} dm={dm} size={190} onClick={() => setDetalle(d)} />)}
        </div>
      )}

      {/* Estado vacío */}
      {datosEmpleado.length === 0 && (
        <div style={{ textAlign:"center", padding:"60px 20px" }}>
          <p style={{ fontSize:40 }}>📭</p>
          <p style={{ color:muted, fontSize:14, fontWeight:700 }}>Sin empleados para este filtro</p>
        </div>
      )}

      {/* Modal detalle de una persona */}
      {detalle && (
        <ModalDetalleFichaje
          u={detalle.u}
          emp={detalle.emp}
          misF={detalle.misF}
          vacaciones={detalle.misVac}
          periodo={periodo}
          rango={rango}
          fechaRef={fechaRef}
          rangoLabel={rangoLabel()}
          dm={dm}
          db={db}
          onEditar={f => { setDetalle(null); setModalManual({ fichaje: f }); }}
          onClose={() => setDetalle(null)}
        />
      )}

      {/* Modal registrar/editar fichaje manual */}
      {modalManual && (
        <ModalFichajeManual
          db={db} dm={dm} USUARIOS={USUARIOS} EMPRESAS={EMPRESAS} empColor={empColor}
          fichaje={modalManual.fichaje || null}
          onClose={() => setModalManual(null)}
        />
      )}
    </div>
  );
}

function FilaEmpleado({ d, dm, border, textPri, muted, fmtTime, fmtHoras, periodo }) {
  const { u, emp, activoAhora, totalMins, ultimoFichaje, misF } = d;
  const hoy = misF.length > 0;
  const color = activoAhora ? "#38A169" : hoy ? "#3182CE" : "#E53E3E";
  const label = activoAhora ? "🟢 Fichado" : hoy ? "✅ Ha fichado" : "❌ Sin fichar";

  return (
    <tr style={{ borderBottom:`1px solid ${dm?"#0D1424":"#F1F5F9"}` }}>
      {/* Empleado */}
      <td style={{ padding:"12px 16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ position:"relative", flexShrink:0 }}>
            <div style={{ width:34, height:34, borderRadius:"50%", background:(emp?.color||"#888")+"33", border:`2px solid ${activoAhora?emp?.color||"#38A169":dm?"#2E3A55":"#E2E8F0"}`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:emp?.color||"#888", fontSize:11 }}>
              {u.nombre.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
            </div>
            {activoAhora && <span style={{ position:"absolute", bottom:0, right:0, width:9, height:9, borderRadius:"50%", background:"#38A169", border:`2px solid ${dm?"#111827":"#FFFFFF"}` }} />}
          </div>
          <div>
            <p style={{ margin:0, fontWeight:700, fontSize:13, color:textPri }}>{u.nombre}</p>
            <p style={{ margin:0, fontSize:11, color:muted }}>{u.rol}</p>
          </div>
        </div>
      </td>

      {/* Empresa */}
      <td style={{ padding:"12px 16px" }}>
        {emp && <span style={{ background:emp.color+"18", color:emp.color, borderRadius:4, padding:"2px 8px", fontSize:11, fontWeight:700 }}>{emp.nombre.split(" ")[0]}</span>}
      </td>

      {/* Estado */}
      <td style={{ padding:"12px 16px" }}>
        <span style={{ background:color+"18", color, border:`1px solid ${color}44`, borderRadius:99, padding:"4px 12px", fontSize:12, fontWeight:700, whiteSpace:"nowrap" }}>
          {label}
        </span>
      </td>

      {/* Entrada */}
      <td style={{ padding:"12px 16px", color:hoy?"#38A169":muted, fontWeight:hoy?700:400 }}>
        {ultimoFichaje ? fmtTime(ultimoFichaje.entrada) : "—"}
      </td>

      {/* Salida */}
      <td style={{ padding:"12px 16px", color:ultimoFichaje?.salida?"#E53E3E":muted, fontWeight:ultimoFichaje?.salida?700:400 }}>
        {ultimoFichaje?.salida ? fmtTime(ultimoFichaje.salida) : activoAhora ? <span style={{ color:"#38A169", fontWeight:600 }}>En curso</span> : "—"}
      </td>

      {/* Horas totales */}
      <td style={{ padding:"12px 16px" }}>
        {totalMins > 0 ? (
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ flex:1, height:6, background:dm?"#1E293B":"#F1F5F9", borderRadius:99, overflow:"hidden", minWidth:60 }}>
              <div style={{ height:"100%", width:`${Math.min(100,(totalMins/(periodo==="dia"?480:periodo==="semana"?2400:periodo==="mes"?10560:120960))*100)}%`, background:totalMins>=(periodo==="dia"?480:1)?color:"#D4A017", borderRadius:99 }} />
            </div>
            <span style={{ color:textPri, fontWeight:700, fontSize:12, whiteSpace:"nowrap" }}>{fmtHoras(totalMins)}</span>
          </div>
        ) : <span style={{ color:muted }}>—</span>}
      </td>
    </tr>
  );
}


// ── Divide el periodo en unidades (semana=5 · mes=días · año=12 meses) ──
function unidadesFichaje(misF, periodo, rango, vacaciones = []) {
  const hoyStr = new Date().toISOString().split("T")[0];
  const fechaDe = f => f.fecha || (f.entrada || "").split("T")[0];
  const esVac = fstr => (vacaciones || []).some(v => fstr >= v.fechaInicio && fstr <= v.fechaFin);
  const isoDe = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const fichajesDe = fstr => misF.filter(f => fechaDe(f) === fstr);
  const minsDia = (arr, fstr) => arr.reduce((a, f) => {
    if (f.salida) return a + Math.max(0, Math.round((new Date(f.salida) - new Date(f.entrada)) / 60000));
    if (fstr === hoyStr) return a + Math.max(0, Math.round((Date.now() - new Date(f.entrada)) / 60000));
    return a;
  }, 0);
  const es = arr => {
    if (!arr.length) return { entrada: null, salida: null };
    const ent = [...arr].sort((a, b) => new Date(a.entrada) - new Date(b.entrada))[0].entrada;
    const done = arr.filter(f => f.salida);
    return { entrada: ent, salida: done.length ? [...done].sort((a, b) => new Date(b.salida) - new Date(a.salida))[0].salida : "curso" };
  };
  const MES_L = ["E","F","M","A","M","J","J","A","S","O","N","D"];
  const MES_N = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const DIA_N = ["dom","lun","mar","mié","jue","vie","sáb"];
  const units = []; let totalMins = 0;

  if (periodo === "semana") {
    const lun = new Date(rango.desde + "T12:00:00");
    const dn = ["Lunes","Martes","Miércoles","Jueves","Viernes"];
    for (let i = 0; i < 5; i++) {
      const dd = new Date(lun); dd.setDate(lun.getDate() + i); const fstr = isoDe(dd);
      const arr = fichajesDe(fstr), worked = arr.length > 0, mins = minsDia(arr, fstr), future = fstr > hoyStr, e = es(arr);
      totalMins += mins;
      units.push({ fecha: fstr, label: ["L","M","X","J","V"][i], full: `${dn[i]} ${dd.getDate()}`, worked, future, laborable: true, vacacion: esVac(fstr), mins, entrada: e.entrada, salida: e.salida });
    }
  } else if (periodo === "mes") {
    const ref = new Date(rango.desde + "T12:00:00"), y = ref.getFullYear(), m = ref.getMonth(), dim = new Date(y, m + 1, 0).getDate();
    for (let day = 1; day <= dim; day++) {
      const dd = new Date(y, m, day, 12); const fstr = isoDe(dd); const dow = dd.getDay(); const laborable = dow >= 1 && dow <= 5;
      const arr = fichajesDe(fstr), worked = arr.length > 0, mins = minsDia(arr, fstr), future = fstr > hoyStr, e = es(arr);
      totalMins += mins;
      units.push({ fecha: fstr, label: (day === 1 || day % 5 === 0) ? String(day) : "", full: `${day} ${MES_N[m]} · ${DIA_N[dow]}`, worked, future, laborable, vacacion: esVac(fstr), mins, entrada: e.entrada, salida: e.salida });
    }
  } else {
    const y = new Date(rango.desde + "T12:00:00").getFullYear(), now = new Date();
    for (let mo = 0; mo < 12; mo++) {
      const arr = misF.filter(f => { const fe = fechaDe(f); return fe && Number(fe.slice(0, 4)) === y && Number(fe.slice(5, 7)) === mo + 1; });
      const worked = arr.length > 0;
      const future = y > now.getFullYear() || (y === now.getFullYear() && mo > now.getMonth());
      const dias = new Set(arr.map(fechaDe)); let mins = 0; dias.forEach(fs => { mins += minsDia(fichajesDe(fs), fs); });
      totalMins += mins;
      units.push({ label: MES_L[mo], full: MES_N[mo], worked, future, laborable: true, mins, diasFichados: dias.size });
    }
  }
  return { units, totalMins };
}

// ── Modal: detalle de fichajes de una persona (cuándo sí, cuándo no) ──
function ModalDetalleFichaje({ u, emp, misF, vacaciones = [], periodo, rango, fechaRef, rangoLabel, dm, db, onEditar, onClose }) {
  const card = dm ? "#111827" : "#FFFFFF", border = dm ? "#2E3A55" : "#E2E8F0", text = dm ? "#E2E8F0" : "#0F172A", muted = dm ? "#64748B" : "#94A3B8", bg2 = dm ? "#0D1424" : "#F8FAFC";
  const VERDE = "#38A169", ROJO = "#E53E3E", VACAC = "#805AD5", GRIS = dm ? "#334155" : "#CBD5E1";
  const esVacDia = fstr => (vacaciones || []).some(v => fstr >= v.fechaInicio && fstr <= v.fechaFin);
  const fmtT = iso => iso && iso !== "curso" ? new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : iso === "curso" ? "en curso" : "—";
  const fmtH = m => { const h = Math.floor(m / 60), mm = m % 60; return h > 0 ? `${h}h${mm > 0 ? ` ${mm}m` : ""}` : `${mm}m`; };
  const esDia = periodo === "dia";
  const { units, totalMins } = esDia ? { units: [], totalMins: 0 } : unidadesFichaje(misF, periodo, rango, vacaciones);

  let diaPairs = [], diaMins = 0;
  if (esDia) {
    const fechaDe = f => f.fecha || (f.entrada || "").split("T")[0];
    const hoyStr = new Date().toISOString().split("T")[0];
    diaPairs = misF.filter(f => fechaDe(f) === fechaRef).sort((a, b) => new Date(a.entrada) - new Date(b.entrada));
    diaMins = diaPairs.reduce((a, f) => a + (f.salida ? Math.max(0, Math.round((new Date(f.salida) - new Date(f.entrada)) / 60000)) : (fechaRef === hoyStr ? Math.max(0, Math.round((Date.now() - new Date(f.entrada)) / 60000)) : 0)), 0);
  }

  const totMin = esDia ? diaMins : totalMins;
  const diasFichados = esDia ? (diaPairs.length ? 1 : 0) : units.filter(x => x.worked).length;
  const diasSinFichar = esDia ? 0 : units.filter(x => x.laborable && !x.future && !x.worked && !x.vacacion).length;
  const diasVacaciones = esDia ? 0 : units.filter(x => x.vacacion && !x.worked).length;

  const colorUnit = un => un.future ? GRIS : un.worked ? VERDE : un.vacacion ? VACAC : un.laborable ? ROJO : GRIS;
  const estadoUnit = un => un.future ? "—" : un.worked ? (un.diasFichados != null ? `${un.diasFichados} días · ${fmtH(un.mins)}` : `${fmtT(un.entrada)} – ${fmtT(un.salida)} · ${fmtH(un.mins)}`) : un.vacacion ? "🏖️ Vacaciones" : un.laborable ? "Sin fichar" : "No laborable";
  const inicial = u.nombre.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, background: "#00000099", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div onMouseDown={e => e.stopPropagation()} style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "88vh", overflow: "auto", padding: 24, boxShadow: "0 24px 80px #0009" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: (emp?.color || "#888") + "22", border: `2px solid ${emp?.color || "#888"}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: emp?.color || "#888", fontSize: 15, flexShrink: 0 }}>{inicial}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, color: text, fontSize: 16, fontWeight: 800 }}>{u.nombre}</h3>
            <p style={{ margin: 0, color: muted, fontSize: 12 }}>{u.rol}{emp ? ` · ${emp.nombre}` : ""}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: muted, fontSize: 24, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
          <RoscoFichaje u={u} emp={emp} misF={misF} periodo={periodo} rango={rango} fechaRef={fechaRef} dm={dm} size={260} />
        </div>
        <p style={{ textAlign: "center", color: muted, fontSize: 12, margin: "0 0 16px", textTransform: "capitalize" }}>{rangoLabel}</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 18 }}>
          {[["Horas", fmtH(totMin), VERDE], ["Días fichados", String(diasFichados), VERDE], [diasVacaciones > 0 ? "Vacaciones" : "Sin fichar", String(diasVacaciones > 0 ? diasVacaciones : diasSinFichar), diasVacaciones > 0 ? VACAC : ROJO]].map(([l, v, c]) => (
            <div key={l} style={{ background: bg2, borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: c }}>{v}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: muted, marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>

        <h4 style={{ margin: "0 0 8px", color: text, fontSize: 13, fontWeight: 800 }}>Desglose</h4>
        {esDia ? (
          diaPairs.length === 0 ? (
            <div style={{ padding: "18px", textAlign: "center", color: esVacDia(fechaRef) ? VACAC : muted, fontSize: 13, fontWeight: esVacDia(fechaRef) ? 700 : 400, background: bg2, borderRadius: 10 }}>{esVacDia(fechaRef) ? "🏖️ Día de vacaciones" : "Sin fichajes este día"}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {diaPairs.map((f, i) => {
                const mins = f.salida ? Math.max(0, Math.round((new Date(f.salida) - new Date(f.entrada)) / 60000)) : 0;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: bg2, borderRadius: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: VERDE, flexShrink: 0 }} />
                    <span style={{ color: text, fontSize: 13, fontWeight: 700 }}>{fmtT(f.entrada)} → {f.salida ? fmtT(f.salida) : <span style={{ color: VERDE }}>en curso</span>}</span>
                    <span style={{ marginLeft: "auto", color: muted, fontSize: 12, fontWeight: 700 }}>{f.salida ? fmtH(mins) : ""}</span>
                    {onEditar && <button onClick={() => onEditar(f)} title="Editar" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: muted, padding: "2px 4px" }}>✏️</button>}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 280, overflow: "auto" }}>
            {units.map((un, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", background: bg2, borderRadius: 8 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: colorUnit(un), flexShrink: 0 }} />
                <span style={{ color: text, fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>{un.full}</span>
                <span style={{ marginLeft: "auto", color: un.worked ? text : muted, fontSize: 12, fontWeight: un.worked ? 700 : 400 }}>{estadoUnit(un)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Rosco de fichajes por persona: el anillo es la línea de tiempo ──
// Horario laboral: L–V, 8:00–15:00. Verde = fichó · Rojo = no fichó (día laborable)
// Gris = no laborable (findes) · Gris claro = aún no ha llegado.
function RoscoFichaje({ u, emp, misF, vacaciones = [], inactivo = false, periodo, rango, fechaRef, dm, size = 190, onClick }) {
  const cx = size / 2, cy = size / 2, ro = size / 2 - 13, ri = size / 2 - 35;
  const TAU = Math.PI * 2, TOP = -Math.PI / 2;
  const textPri = dm ? "#E2E8F0" : "#0F172A";
  const muted   = dm ? "#64748B" : "#94A3B8";
  const cardBg  = dm ? "#111827" : "#FFFFFF";
  const VERDE = "#38A169", ROJO = "#E53E3E", VACAC = "#805AD5";
  const TRACK = dm ? "#1E293B" : "#E5E9F0";   // no laborable / vacío
  const FUT   = dm ? "#152036" : "#EEF2F6";   // futuro
  const hoyStr = new Date().toISOString().split("T")[0];
  const esVac = fstr => (vacaciones || []).some(v => fstr >= v.fechaInicio && fstr <= v.fechaFin);

  const arcSeg = (r0i, r0o, a0, a1) => {
    const p = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    const large = (a1 - a0) > Math.PI ? 1 : 0;
    const o0 = p(r0o, a0), o1 = p(r0o, a1), i1 = p(r0i, a1), i0 = p(r0i, a0);
    return `M${o0[0]} ${o0[1]} A${r0o} ${r0o} 0 ${large} 1 ${o1[0]} ${o1[1]} L${i1[0]} ${i1[1]} A${r0i} ${r0i} 0 ${large} 0 ${i0[0]} ${i0[1]} Z`;
  };
  const fmtT   = iso => iso ? new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "—";
  const fmtH   = m => { const h = Math.floor(m / 60), mm = m % 60; return h > 0 ? `${h}h${mm > 0 ? ` ${mm}m` : ""}` : `${mm}m`; };
  const fechaDe = f => f.fecha || (f.entrada || "").split("T")[0];
  const fichajesDe = fstr => misF.filter(f => fechaDe(f) === fstr);
  const minsDe = arr => arr.reduce((a, f) => {
    if (f.salida) return a + Math.max(0, Math.round((new Date(f.salida) - new Date(f.entrada)) / 60000));
    const fday = f.fecha || (f.entrada || "").split("T")[0];
    if (fday === hoyStr) return a + Math.max(0, Math.round((Date.now() - new Date(f.entrada)) / 60000));
    return a;
  }, 0);
  const isoDe = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const MES_L = ["E","F","M","A","M","J","J","A","S","O","N","D"];
  const MES_N = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

  const sectors = [];   // { d, fill, tip }
  const ticks   = [];   // { x1,y1,x2,y2,stroke,w }
  const labels  = [];   // { x,y,t,size,fill,w,anchor }
  let totalMins = 0;
  const primer = u.nombre.split(" ")[0];

  if (periodo === "dia") {
    const fstr = fechaRef;
    const d = new Date(fstr + "T12:00:00");
    const dow = d.getDay(), laborable = dow >= 1 && dow <= 5;
    const arr = fichajesDe(fstr);
    totalMins = minsDe(arr);
    const ang = m => TOP + (m / 1440) * TAU;
    // Track completo
    sectors.push({ d: arcSeg(ri, ro, TOP + 0.001, TOP + TAU - 0.001), fill: TRACK, tip: "" });
    // Franja horario previsto 8:00–15:00 (o vacaciones)
    const enVac = esVac(fstr);
    const bandCol = !laborable ? TRACK : arr.length ? VERDE + "33" : enVac ? VACAC : (fstr > hoyStr ? FUT : ROJO + "2E");
    sectors.push({ d: arcSeg(ri, ro, ang(8 * 60), ang(15 * 60)), fill: bandCol, tip: enVac ? "🏖️ Vacaciones" : laborable ? "Horario previsto 8:00–15:00" : "No laborable" });
    // Arcos de presencia real
    arr.forEach(f => {
      const iniM = new Date(f.entrada).getHours() * 60 + new Date(f.entrada).getMinutes();
      const finM = f.salida ? new Date(f.salida).getHours() * 60 + new Date(f.salida).getMinutes() : (new Date().getHours() * 60 + new Date().getMinutes());
      sectors.push({ d: arcSeg(ri, ro, ang(iniM), ang(Math.max(finM, iniM + 4))), fill: VERDE, tip: `Entrada ${fmtT(f.entrada)} · Salida ${f.salida ? fmtT(f.salida) : "en curso"}` });
      const ex = cx + (ri - 9) * Math.cos(ang(iniM)), ey = cy + (ri - 9) * Math.sin(ang(iniM)) + 3;
      labels.push({ x: ex, y: ey, t: fmtT(f.entrada), size: 8, fill: VERDE, w: 800 });
      if (f.salida) { const sx = cx + (ri - 9) * Math.cos(ang(finM)), sy = cy + (ri - 9) * Math.sin(ang(finM)) + 3;
        labels.push({ x: sx, y: sy, t: fmtT(f.salida), size: 8, fill: ROJO, w: 800 }); }
    });
    // Ticks de horas
    for (let h = 0; h < 24; h++) { const a = ang(h * 60), mayor = h % 6 === 0;
      ticks.push({ x1: cx + ro * Math.cos(a), y1: cy + ro * Math.sin(a), x2: cx + (ro + (mayor ? 6 : 3)) * Math.cos(a), y2: cy + (ro + (mayor ? 6 : 3)) * Math.sin(a), stroke: mayor ? muted : (dm ? "#334155" : "#CBD5E1"), w: mayor ? 1.4 : 0.7 });
      if (mayor) labels.push({ x: cx + (ro + 13) * Math.cos(a), y: cy + (ro + 13) * Math.sin(a) + 3, t: h + "h", size: 7.5, fill: muted, w: 700 });
    }
  } else {
    // semana / mes / anio → divisiones discretas
    const units = [];
    if (periodo === "semana") {
      const lun = new Date(rango.desde + "T12:00:00");
      const dn = ["Lunes","Martes","Miércoles","Jueves","Viernes"];
      for (let i = 0; i < 5; i++) {
        const dd = new Date(lun); dd.setDate(lun.getDate() + i); const fstr = isoDe(dd);
        const arr = fichajesDe(fstr), worked = arr.length > 0, mins = minsDe(arr), future = fstr > hoyStr;
        totalMins += mins;
        const ent = worked ? fmtT([...arr].sort((a, b) => new Date(a.entrada) - new Date(b.entrada))[0].entrada) : null;
        const done = arr.filter(f => f.salida);
        const sal = worked ? (done.length ? fmtT([...done].sort((a, b) => new Date(b.salida) - new Date(a.salida))[0].salida) : "en curso") : null;
        const vac = esVac(fstr);
        units.push({ label: ["L","M","X","J","V"][i], worked, future, laborable: true, vacacion: vac, mins,
          tip: `${dn[i]} · ${worked ? `${ent}–${sal} · ${fmtH(mins)}` : vac ? "🏖️ Vacaciones" : future ? "—" : "Sin fichar"}` });
      }
    } else if (periodo === "mes") {
      const ref = new Date(rango.desde + "T12:00:00"), y = ref.getFullYear(), m = ref.getMonth();
      const dim = new Date(y, m + 1, 0).getDate();
      for (let day = 1; day <= dim; day++) {
        const dd = new Date(y, m, day, 12); const fstr = isoDe(dd); const dow = dd.getDay();
        const laborable = dow >= 1 && dow <= 5;
        const arr = fichajesDe(fstr), worked = arr.length > 0, mins = minsDe(arr), future = fstr > hoyStr;
        totalMins += mins;
        const vac = esVac(fstr);
        units.push({ label: (day === 1 || day % 5 === 0) ? String(day) : "", worked, future, laborable, vacacion: vac, mins,
          tip: `${day} ${MES_N[m]} · ${worked ? `${fmtH(mins)}` : vac ? "🏖️ Vacaciones" : !laborable ? "No laborable" : future ? "—" : "Sin fichar"}` });
      }
    } else { // anio
      const y = new Date(rango.desde + "T12:00:00").getFullYear(), now = new Date();
      for (let mo = 0; mo < 12; mo++) {
        const arr = misF.filter(f => { const fe = fechaDe(f); return fe && Number(fe.slice(0, 4)) === y && Number(fe.slice(5, 7)) === mo + 1; });
        const worked = arr.length > 0, mins = minsDe(arr);
        const future = y > now.getFullYear() || (y === now.getFullYear() && mo > now.getMonth());
        const dias = new Set(arr.map(fechaDe)).size;
        totalMins += mins;
        units.push({ label: MES_L[mo], worked, future, laborable: true, mins,
          tip: `${MES_N[mo]} · ${future ? "—" : worked ? `${dias} días · ${fmtH(mins)}` : "Sin fichar"}` });
      }
    }
    const n = units.length, gap = n > 15 ? 0.012 : 0.03;
    const rMid = (ro + ri) / 2;
    units.forEach((un, i) => {
      const a0 = TOP + (i / n) * TAU + gap / 2, a1 = TOP + ((i + 1) / n) * TAU - gap / 2, am = (a0 + a1) / 2;
      const fill = un.future ? FUT : un.worked ? VERDE : un.vacacion ? VACAC : un.laborable ? ROJO : TRACK;
      sectors.push({ d: arcSeg(ri, ro, a0, a1), fill, tip: un.tip });
      if (un.label) labels.push({ x: cx + (ro + 8) * Math.cos(am), y: cy + (ro + 8) * Math.sin(am) + 3, t: un.label, size: 8.5, fill: muted, w: 700 });
      if (periodo === "semana" && un.worked) labels.push({ x: cx + rMid * Math.cos(am), y: cy + rMid * Math.sin(am) + 3, t: fmtH(un.mins), size: 8, fill: "#fff", w: 800 });
    });
  }

  if (inactivo) {
    return (
      <div style={{ background: cardBg, border: `1px dashed ${muted}66`, borderRadius: 14, padding: 12, display: "flex", flexDirection: "column", alignItems: "center", opacity: 0.75 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={size * 0.36} fill="none" stroke={dm ? "#1E293B" : "#E5E9F0"} strokeWidth={size * 0.09} />
          <text x={cx} y={cy + size * 0.02} textAnchor="middle" fontSize={size * 0.3} fontWeight="900" fill={muted}>✕</text>
          <text x={cx} y={cy + size * 0.17} textAnchor="middle" fontSize={size * 0.06} fontWeight="800" fill={muted} letterSpacing="1">INACTIVO</text>
        </svg>
        <p style={{ margin: "6px 0 0", fontSize: 11, fontWeight: 700, color: muted, textAlign: "center", maxWidth: size, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>{u.nombre}</p>
      </div>
    );
  }

  return (
    <div onClick={onClick}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.borderColor = (emp?.color || "#888"); e.currentTarget.style.transform = "translateY(-2px)"; } }}
      onMouseLeave={e => { if (onClick) { e.currentTarget.style.borderColor = (emp?.color || "#888") + "33"; e.currentTarget.style.transform = "none"; } }}
      style={{ background: cardBg, border: `1px solid ${(emp?.color || "#888")}33`, borderRadius: 14, padding: 12, display: "flex", flexDirection: "column", alignItems: "center", cursor: onClick ? "pointer" : "default", transition: "transform .12s, border-color .12s" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {sectors.map((s, i) => <path key={"s" + i} d={s.d} fill={s.fill}>{s.tip ? <title>{s.tip}</title> : null}</path>)}
        {ticks.map((t, i) => <line key={"t" + i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={t.stroke} strokeWidth={t.w} />)}
        {labels.map((l, i) => <text key={"l" + i} x={l.x} y={l.y} textAnchor={l.anchor || "middle"} fontSize={l.size} fontWeight={l.w} fill={l.fill}>{l.t}</text>)}
        <text x={cx} y={cy - 1} textAnchor="middle" fontSize={size * 0.135} fontWeight="800" fill={textPri}>{primer}</text>
        <text x={cx} y={cy + size * 0.095} textAnchor="middle" fontSize={size * 0.058} fontWeight="700" fill={muted}>{fmtH(totalMins)}</text>
      </svg>
      <p style={{ margin: "6px 0 0", fontSize: 11, fontWeight: 700, color: textPri, textAlign: "center", maxWidth: size, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>{u.nombre}</p>
    </div>
  );
}

// ===== MÓDULO PROYECTOS: plantillas + helpers (integrado) =====
// =============================================================
//  Módulo Proyectos — Plantillas Gantt
//  Grupo Laura Otero · App Gestión Empresarial
//  Generado a partir de: cronograma_obra_electrica.xlsx
// =============================================================
//
//  MODELO DE DATOS
//  ---------------
//  Plantilla (estructura reutilizable, SIN fechas absolutas):
//    { id, nombre, descripcion, categoria, color, fases: [
//        { nombre, color, tareas: [
//            { nombre, offsetDias, duracionDias, responsableSugerido, avanceEjemplo }
//        ]}
//    ]}
//
//  Proyecto (instancia con fechas reales, se guarda en Firestore `proyectos`):
//    { id, nombre, empresaId, plantillaId, fechaInicio, fechaFin, responsable,
//      estado, creadoPor, creadoEn, fases: [
//        { id, nombre, color, tareas: [
//            { id, nombre, inicio, fin, responsable, avance, dependencias }
//        ]}
//    ]}
//
//  offsetDias  = días desde el inicio del proyecto hasta el inicio de la tarea
//  duracionDias = días naturales que dura la tarea (inicio y fin incluidos)
// =============================================================

// ---------- Helpers de fecha (sin dependencias) ----------
const MS_DIA = 86400000;

function addDias(fechaISO, n) {
  const d = new Date(fechaISO);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function diffDias(iniISO, finISO) {
  return Math.round((new Date(finISO) - new Date(iniISO)) / MS_DIA) + 1;
}

const uidP = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : "id_" + Math.random().toString(36).slice(2, 10);

// ---------- PLANTILLA: Instalación eléctrica (obra) ----------
const PLANTILLA_OBRA_ELECTRICA = {
  id: "plantilla_obra_electrica",
  nombre: "Instalación eléctrica (obra)",
  descripcion: "Cronograma estándar de obra eléctrica: ingeniería, obra civil, cuadros, pruebas y legalización.",
  categoria: "Instalaciones eléctricas",
  color: "#cf142b",
  duracionTotalDias: 121,
  fases: [
    {
      nombre: "Ingeniería y Proyecto",
      color: "#0077ab",
      tareas: [
        { nombre: "Levantamiento de cargas",              offsetDias: 0,  duracionDias: 11, responsableSugerido: "Carlos Méndez", avanceEjemplo: 100 },
        { nombre: "Diseño de esquemas unifilares",         offsetDias: 5,  duracionDias: 16, responsableSugerido: "Ana Torres",    avanceEjemplo: 100 },
        { nombre: "Cálculo de secciones y protecciones",   offsetDias: 12, duracionDias: 11, responsableSugerido: "Carlos Méndez", avanceEjemplo: 100 },
        { nombre: "Memoria técnica y planos",              offsetDias: 18, duracionDias: 13, responsableSugerido: "Laura Vidal",   avanceEjemplo: 85  },
        { nombre: "Aprobación de proyecto",                offsetDias: 28, duracionDias: 11, responsableSugerido: "Dirección",     avanceEjemplo: 60  },
      ],
    },
    {
      nombre: "Obra Civil y Canalizaciones",
      color: "#6B7280",
      tareas: [
        { nombre: "Replanteo de trazados",                 offsetDias: 30, duracionDias: 7,  responsableSugerido: "Pedro Sanz", avanceEjemplo: 50 },
        { nombre: "Apertura de rozas y zanjas",            offsetDias: 33, duracionDias: 18, responsableSugerido: "Equipo A",   avanceEjemplo: 30 },
        { nombre: "Instalación de tubos y bandejas",       offsetDias: 40, duracionDias: 21, responsableSugerido: "Equipo A",   avanceEjemplo: 10 },
        { nombre: "Tendido de cables BT",                  offsetDias: 55, duracionDias: 21, responsableSugerido: "Equipo B",   avanceEjemplo: 0  },
        { nombre: "Tendido de cables MT",                  offsetDias: 60, duracionDias: 26, responsableSugerido: "Equipo B",   avanceEjemplo: 0  },
        { nombre: "Sellado y acabados civiles",            offsetDias: 80, duracionDias: 16, responsableSugerido: "Equipo A",   avanceEjemplo: 0  },
      ],
    },
    {
      nombre: "Cuadros y Equipos",
      color: "#e0ad12",
      tareas: [
        { nombre: "Recepción y verificación de material",  offsetDias: 35, duracionDias: 8,  responsableSugerido: "Almacén",       avanceEjemplo: 40 },
        { nombre: "Montaje CGD / CGBT principal",          offsetDias: 50, duracionDias: 16, responsableSugerido: "Juan Romero",   avanceEjemplo: 5  },
        { nombre: "Montaje cuadros secundarios",           offsetDias: 60, duracionDias: 21, responsableSugerido: "Juan Romero",   avanceEjemplo: 0  },
        { nombre: "Instalación transformador MT/BT",       offsetDias: 65, duracionDias: 16, responsableSugerido: "Proveedor ext.", avanceEjemplo: 0 },
        { nombre: "Montaje equipos de medida",             offsetDias: 75, duracionDias: 14, responsableSugerido: "Ana Torres",    avanceEjemplo: 0  },
      ],
    },
    {
      nombre: "Conexiones y Pruebas",
      color: "#af4a85",
      tareas: [
        { nombre: "Conexionado cuadros y circuitos",       offsetDias: 80,  duracionDias: 16, responsableSugerido: "Juan Romero",   avanceEjemplo: 0 },
        { nombre: "Pruebas de aislamiento (Megger)",       offsetDias: 92,  duracionDias: 7,  responsableSugerido: "Carlos Méndez", avanceEjemplo: 0 },
        { nombre: "Verificación de protecciones",          offsetDias: 95,  duracionDias: 8,  responsableSugerido: "Carlos Méndez", avanceEjemplo: 0 },
        { nombre: "Prueba funcional de circuitos",         offsetDias: 98,  duracionDias: 9,  responsableSugerido: "Equipo B",      avanceEjemplo: 0 },
        { nombre: "Medición de tierras",                   offsetDias: 100, duracionDias: 9,  responsableSugerido: "Ana Torres",    avanceEjemplo: 0 },
      ],
    },
    {
      nombre: "Legalización y Entrega",
      color: "#4F8C0d",
      tareas: [
        { nombre: "Acta de puesta en servicio",            offsetDias: 105, duracionDias: 6, responsableSugerido: "Laura Vidal",   avanceEjemplo: 0 },
        { nombre: "Documentación as-built",                offsetDias: 106, duracionDias: 9, responsableSugerido: "Laura Vidal",   avanceEjemplo: 0 },
        { nombre: "Boletín eléctrico BCIE",                offsetDias: 108, duracionDias: 9, responsableSugerido: "Carlos Méndez", avanceEjemplo: 0 },
        { nombre: "Entrega a cliente",                     offsetDias: 114, duracionDias: 7, responsableSugerido: "Dirección",     avanceEjemplo: 0 },
      ],
    },
  ],
};

// ---------- PLANTILLAS: Construcción ----------
const PLANTILLA_OBRA_EDIFICACION = {
  id: "plantilla_obra_edificacion",
  nombre: "Obra de edificación (construcción)",
  descripcion: "Cronograma de obra de edificación: actuaciones previas, movimiento de tierras, cimentación, estructura, cerramientos, instalaciones y fin de obra.",
  categoria: "Construcción",
  color: "#8B5E3C",
  duracionTotalDias: 261,
  fases: [
    {
      nombre: "Actuaciones previas",
      color: "#6B7280",
      tareas: [
        { nombre: "Vallado y señalización de obra",        offsetDias:   0, duracionDias:  3, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Acometidas provisionales (agua y luz)", offsetDias:   2, duracionDias:  5, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Replanteo general",                     offsetDias:   5, duracionDias:  3, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Casetas de obra y zonas de acopio",     offsetDias:   6, duracionDias:  4, responsableSugerido: "", avanceEjemplo: 0 },
      ],
    },
    {
      nombre: "Movimiento de tierras",
      color: "#8B5E3C",
      tareas: [
        { nombre: "Desbroce y limpieza del terreno",      offsetDias:  10, duracionDias:  4, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Excavación / vaciado a cielo abierto", offsetDias:  14, duracionDias: 10, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Excavación de zanjas y pozos",         offsetDias:  22, duracionDias:  6, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Transporte de tierras a vertedero",    offsetDias:  24, duracionDias:  6, responsableSugerido: "", avanceEjemplo: 0 },
      ],
    },
    {
      nombre: "Saneamiento",
      color: "#0077ab",
      tareas: [
        { nombre: "Red horizontal enterrada",     offsetDias:  28, duracionDias:  8, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Arquetas y pozos de registro", offsetDias:  34, duracionDias:  6, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Pruebas de estanqueidad",      offsetDias:  40, duracionDias:  3, responsableSugerido: "", avanceEjemplo: 0 },
      ],
    },
    {
      nombre: "Cimentaciones",
      color: "#4A5568",
      tareas: [
        { nombre: "Hormigón de limpieza",               offsetDias:  40, duracionDias:  3, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Armado de zapatas y vigas de atado", offsetDias:  43, duracionDias:  8, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Encofrado de cimentación",           offsetDias:  47, duracionDias:  6, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Vertido de hormigón",                offsetDias:  53, duracionDias:  4, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Curado y desencofrado",              offsetDias:  57, duracionDias:  8, responsableSugerido: "", avanceEjemplo: 0 },
      ],
    },
    {
      nombre: "Estructura",
      color: "#2D3748",
      tareas: [
        { nombre: "Encofrado de pilares",             offsetDias:  62, duracionDias: 10, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Armado y hormigonado de pilares",  offsetDias:  70, duracionDias: 10, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Encofrado de forjados",            offsetDias:  78, duracionDias: 14, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Armado y hormigonado de forjados", offsetDias:  90, duracionDias: 14, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Desencofrado y curado",            offsetDias: 100, duracionDias: 12, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Ejecución de escaleras",           offsetDias: 105, duracionDias: 10, responsableSugerido: "", avanceEjemplo: 0 },
      ],
    },
    {
      nombre: "Albañilería",
      color: "#cf142b",
      tareas: [
        { nombre: "Cerramientos de fachada",                offsetDias: 115, duracionDias: 20, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Tabiquería interior",                    offsetDias: 130, duracionDias: 20, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Formación de huecos y dinteles",         offsetDias: 145, duracionDias:  8, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Ayudas a instalaciones (rozas y pasos)", offsetDias: 150, duracionDias: 10, responsableSugerido: "", avanceEjemplo: 0 },
      ],
    },
    {
      nombre: "Cubiertas",
      color: "#e0ad12",
      tareas: [
        { nombre: "Formación de pendientes", offsetDias: 150, duracionDias:  8, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Impermeabilización",      offsetDias: 156, duracionDias:  8, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Aislamiento térmico",     offsetDias: 162, duracionDias:  6, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Cobertura y remates",     offsetDias: 166, duracionDias: 12, responsableSugerido: "", avanceEjemplo: 0 },
      ],
    },
    {
      nombre: "Revestimientos y alicatados",
      color: "#38A169",
      tareas: [
        { nombre: "Enfoscados y guarnecidos",    offsetDias: 175, duracionDias: 15, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Falsos techos",               offsetDias: 185, duracionDias: 12, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Alicatado de baños y cocina", offsetDias: 190, duracionDias: 15, responsableSugerido: "", avanceEjemplo: 0 },
      ],
    },
    {
      nombre: "Pavimentos y remates",
      color: "#3182CE",
      tareas: [
        { nombre: "Solados y pavimentos", offsetDias: 200, duracionDias: 18, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Rodapiés y remates",   offsetDias: 215, duracionDias:  8, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Pintura interior",     offsetDias: 220, duracionDias: 15, responsableSugerido: "", avanceEjemplo: 0 },
      ],
    },
    {
      nombre: "Carpintería y Cerrajería",
      color: "#805AD5",
      tareas: [
        { nombre: "Carpintería exterior (ventanas)", offsetDias: 210, duracionDias: 12, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Carpintería interior (puertas)",  offsetDias: 222, duracionDias: 10, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Cerrajería y barandillas",        offsetDias: 228, duracionDias: 10, responsableSugerido: "", avanceEjemplo: 0 },
      ],
    },
    {
      nombre: "Instalaciones",
      color: "#D4A017",
      tareas: [
        { nombre: "Fontanería y saneamiento interior", offsetDias: 160, duracionDias: 20, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Electricidad y telecomunicaciones", offsetDias: 165, duracionDias: 25, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Climatización y ventilación",       offsetDias: 180, duracionDias: 20, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Aparatos sanitarios y griferías",   offsetDias: 225, duracionDias: 10, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Mecanismos y luminarias",           offsetDias: 230, duracionDias: 10, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Pruebas y puesta en servicio",      offsetDias: 238, duracionDias:  7, responsableSugerido: "", avanceEjemplo: 0 },
      ],
    },
    {
      nombre: "Fin de obra",
      color: "#4F8C0d",
      tareas: [
        { nombre: "Limpieza final",            offsetDias: 240, duracionDias:  6, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Repasos y remates",         offsetDias: 244, duracionDias: 10, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Certificado final de obra", offsetDias: 252, duracionDias:  5, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Entrega y liquidación",     offsetDias: 256, duracionDias:  5, responsableSugerido: "", avanceEjemplo: 0 },
      ],
    },
  ],
};

const PLANTILLA_REFORMA_INTERIOR = {
  id: "plantilla_reforma_interior",
  nombre: "Reforma interior de vivienda",
  descripcion: "Reforma interior sin alteración estructural: licencia, demoliciones, albañilería, instalaciones, revestimientos, carpinterías, pinturas y entrega.",
  categoria: "Construcción",
  color: "#D4A017",
  duracionTotalDias: 84,
  fases: [
    {
      nombre: "Gestión previa y licencia",
      color: "#6B7280",
      tareas: [
        { nombre: "Redacción de memoria técnica",       offsetDias:   0, duracionDias:  7, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Licencia / declaración responsable", offsetDias:   5, duracionDias: 10, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Plan de gestión de residuos",        offsetDias:   8, duracionDias:  3, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Plan de seguridad y salud",          offsetDias:   8, duracionDias:  3, responsableSugerido: "", avanceEjemplo: 0 },
      ],
    },
    {
      nombre: "Demoliciones",
      color: "#8B5E3C",
      tareas: [
        { nombre: "Levantado de pavimentos existentes",         offsetDias:  15, duracionDias:  4, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Picado y retirada de revestimientos",        offsetDias:  17, duracionDias:  4, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Desmontaje de aparatos sanitarios",          offsetDias:  19, duracionDias:  2, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Retirada de mobiliario fijo de cocina",      offsetDias:  20, duracionDias:  2, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Desmontaje de carpinterías interiores",      offsetDias:  21, duracionDias:  2, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Retirada de falsos techos deteriorados",     offsetDias:  22, duracionDias:  3, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Transporte de residuos a gestor autorizado", offsetDias:  24, duracionDias:  3, responsableSugerido: "", avanceEjemplo: 0 },
      ],
    },
    {
      nombre: "Albañilería",
      color: "#cf142b",
      tareas: [
        { nombre: "Tabiquería no estructural (fábrica / cartón-yeso)", offsetDias:  26, duracionDias:  8, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Ayudas a instalaciones (rozas y pasos)",            offsetDias:  30, duracionDias:  6, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Enfoscados y enlucidos",                            offsetDias:  36, duracionDias:  7, responsableSugerido: "", avanceEjemplo: 0 },
      ],
    },
    {
      nombre: "Instalaciones",
      color: "#D4A017",
      tareas: [
        { nombre: "Fontanería: nueva distribución",    offsetDias:  30, duracionDias:  8, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Evacuación y saneamiento interior", offsetDias:  34, duracionDias:  5, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Electricidad y mecanismos",         offsetDias:  32, duracionDias: 10, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Pruebas de estanqueidad",           offsetDias:  43, duracionDias:  3, responsableSugerido: "", avanceEjemplo: 0 },
      ],
    },
    {
      nombre: "Pavimentos y revestimientos",
      color: "#38A169",
      tareas: [
        { nombre: "Preparación de soporte",               offsetDias:  44, duracionDias:  4, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Alicatado cerámico de baños y cocina", offsetDias:  46, duracionDias:  8, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Colocación de pavimento interior",     offsetDias:  52, duracionDias:  8, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Rodapiés y remates",                   offsetDias:  59, duracionDias:  4, responsableSugerido: "", avanceEjemplo: 0 },
      ],
    },
    {
      nombre: "Carpinterías",
      color: "#805AD5",
      tareas: [
        { nombre: "Puertas interiores (madera lacada/laminada)", offsetDias:  62, duracionDias:  6, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Herrajes, manivelas y bisagras",              offsetDias:  67, duracionDias:  3, responsableSugerido: "", avanceEjemplo: 0 },
      ],
    },
    {
      nombre: "Pinturas y acabados",
      color: "#3182CE",
      tareas: [
        { nombre: "Preparación de paramentos", offsetDias:  68, duracionDias:  4, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Pintura plástica lavable",  offsetDias:  71, duracionDias:  7, responsableSugerido: "", avanceEjemplo: 0 },
      ],
    },
    {
      nombre: "Aparatos y entrega",
      color: "#4F8C0d",
      tareas: [
        { nombre: "Aparatos sanitarios y griferías", offsetDias:  70, duracionDias:  5, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Mecanismos y luminarias",         offsetDias:  74, duracionDias:  4, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Limpieza final",                  offsetDias:  78, duracionDias:  3, responsableSugerido: "", avanceEjemplo: 0 },
        { nombre: "Repasos y entrega",               offsetDias:  80, duracionDias:  4, responsableSugerido: "", avanceEjemplo: 0 },
      ],
    },
  ],
};

// Tipos de proyecto y sus plantillas
const TIPOS_PROYECTO = [
  { id: "electrico",    label: "⚡ Proyecto eléctrico",    color: "#e0ad12", desc: "Instalaciones eléctricas" },
  { id: "construccion", label: "🏗️ Proyecto de construcción", color: "#8B5E3C", desc: "Obra y reforma" },
];

// Registro de plantillas disponibles (añade aquí futuras plantillas)
const PLANTILLA_OBRA_ELECTRICA_T   = { ...PLANTILLA_OBRA_ELECTRICA,   tipo: "electrico" };
const PLANTILLA_OBRA_EDIFICACION_T = { ...PLANTILLA_OBRA_EDIFICACION, tipo: "construccion" };
const PLANTILLA_REFORMA_INTERIOR_T = { ...PLANTILLA_REFORMA_INTERIOR, tipo: "construccion" };
const PLANTILLAS = [PLANTILLA_OBRA_ELECTRICA_T, PLANTILLA_OBRA_EDIFICACION_T, PLANTILLA_REFORMA_INTERIOR_T];

// ---------- Instanciar un proyecto desde una plantilla ----------
// opciones: { nombre, fechaInicio (YYYY-MM-DD), empresaId, creadoPor, usarAvanceEjemplo }
function crearProyectoDesdePlantilla(plantilla, opciones = {}) {
  const {
    nombre = plantilla.nombre,
    fechaInicio = new Date().toISOString().slice(0, 10),
    empresaId = 0,
    creadoPor = null,
    usarAvanceEjemplo = false,
  } = opciones;

  let finMax = fechaInicio;

  const fases = plantilla.fases.map((f) => ({
    id: uidP(),
    nombre: f.nombre,
    color: f.color || plantilla.color || "#6B7280",
    tareas: f.tareas.map((t) => {
      const inicio = addDias(fechaInicio, t.offsetDias);
      const fin = addDias(inicio, t.duracionDias - 1);
      if (new Date(fin) > new Date(finMax)) finMax = fin;
      return {
        id: uidP(),
        nombre: t.nombre,
        inicio,
        fin,
        responsable: t.responsableSugerido || "",
        avance: usarAvanceEjemplo ? (t.avanceEjemplo || 0) : 0,
        dependencias: [],
      };
    }),
  }));

  return {
    id: uidP(),
    nombre,
    empresaId,
    plantillaId: plantilla.id,
    fechaInicio,
    fechaFin: finMax,
    responsable: "",
    estado: "En progreso", // Planificado | En progreso | Completado | Cancelado
    creadoPor,
    creadoEn: new Date().toISOString(),
    fases,
  };
}

// Proyecto en blanco (creación manual, sin plantilla)
function crearProyectoVacio(opciones = {}) {
  const fechaInicio = opciones.fechaInicio || new Date().toISOString().slice(0, 10);
  return {
    id: uidP(),
    nombre: opciones.nombre || "Nuevo proyecto",
    empresaId: opciones.empresaId ?? 0,
    plantillaId: null,
    fechaInicio,
    fechaFin: fechaInicio,
    responsable: "",
    estado: "Planificado",
    creadoPor: opciones.creadoPor || null,
    creadoEn: new Date().toISOString(),
    fases: [],
  };
}

// Progreso global de un proyecto (media ponderada por duración de tarea)
function progresoProyecto(proyecto) {
  let totalDias = 0, ponderado = 0;
  for (const f of proyecto.fases) {
    for (const t of f.tareas) {
      const d = Math.max(1, diffDias(t.inicio, t.fin));
      totalDias += d;
      ponderado += d * (t.avance || 0);
    }
  }
  return totalDias ? Math.round(ponderado / totalDias) : 0;
}

// =============================================================
//  IMPORT / EXPORT EXCEL  (requiere SheetJS: `npm i xlsx`)
//  import * as XLSX from "xlsx";
//  Mismo formato de columnas que tu cronograma:
//  Fase | Tarea / Actividad | Inicio | Fin | Responsable | % Avance
//  (filas de fase = sin tarea/fechas, actúan de agrupador)
// =============================================================

const COL = ["Fase", "Tarea / Actividad", "Inicio", "Fin", "Responsable", "% Avance"];

function excelSerialAISO(v) {
  // 25569 = días entre 1899-12-30 y 1970-01-01
  const d = new Date(Math.round((Number(v) - 25569) * MS_DIA));
  return d.toISOString().slice(0, 10);
}
function parseFecha(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return excelSerialAISO(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/); // DD/MM/AAAA
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const d = new Date(s);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
}
const fmtESx = (iso) => {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
};

// XLSX = instancia de SheetJS pasada por el caller
function parseExcelCronograma(XLSX, arrayBuffer, opciones = {}) {
  const wb = XLSX.read(arrayBuffer, { type: "array" });
  const ws = wb.Sheets["Cronograma"] || wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

  const fases = [];
  let cur = null;
  for (const r of rows) {
    const fase = r["Fase"];
    const tarea = r["Tarea / Actividad"];
    if (fase && !tarea) {
      cur = { id: uidP(), nombre: String(fase), color: "#6B7280", tareas: [] };
      fases.push(cur);
    } else if (tarea) {
      if (!cur) { cur = { id: uidP(), nombre: String(fase || "General"), color: "#6B7280", tareas: [] }; fases.push(cur); }
      const inicio = parseFecha(r["Inicio"]);
      const fin = parseFecha(r["Fin"]) || inicio;
      cur.tareas.push({
        id: uidP(),
        nombre: String(tarea),
        inicio,
        fin,
        responsable: String(r["Responsable"] || ""),
        avance: Number(r["% Avance"]) || 0,
        dependencias: [],
      });
    }
  }
  const todas = fases.flatMap((f) => f.tareas).map((t) => t.fin).filter(Boolean);
  return {
    id: uidP(),
    nombre: opciones.nombre || "Proyecto importado",
    empresaId: opciones.empresaId ?? 0,
    plantillaId: null,
    fechaInicio: fases[0]?.tareas[0]?.inicio || new Date().toISOString().slice(0, 10),
    fechaFin: todas.length ? todas.sort().at(-1) : "",
    responsable: "",
    estado: "En progreso",
    creadoPor: opciones.creadoPor || null,
    creadoEn: new Date().toISOString(),
    fases,
  };
}

function exportarProyectoExcel(XLSX, proyecto) {
  const aoa = [COL];
  for (const f of proyecto.fases) {
    aoa.push([f.nombre, "", "", "", "", ""]); // fila de fase
    for (const t of f.tareas) {
      aoa.push([f.nombre, t.nombre, fmtESx(t.inicio), fmtESx(t.fin), t.responsable, t.avance]);
    }
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{ wch: 26 }, { wch: 34 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 10 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cronograma");
  XLSX.writeFile(wb, `${proyecto.nombre.replace(/\s+/g, "_")}.xlsx`);
}


// ===== MÓDULO PROYECTOS: componentes UI (integrado) =====
// =============================================================
//  SeccionProyectos.jsx — Módulo Proyectos con Gantt
//  Grupo Laura Otero · App Gestión Empresarial
//  Requiere: ./plantillaProyectos.js  y (para Excel) `npm i xlsx`
// =============================================================


const ESTADOS_PROY = {
  "Planificado":  "#6B7280",
  "En progreso":  "#3182CE",
  "Completado":   "#38A169",
  "Cancelado":    "#E53E3E",
};
const MESES_ABR = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const fmtES = (iso) => { if (!iso) return "—"; const [a,m,d]=iso.split("-"); return `${d}/${m}/${a}`; };

// ─── Componente principal ───────────────────────────────────
function SeccionProyectos({ db, darkMode, usuario, usuarioId, empColor, USUARIOS, EMPRESAS, permisoCrear }) {
  const [proyectos, setProyectos] = useState([]);
  const [abierto, setAbierto] = useState(null);     // id del proyecto en detalle
  const [modalNuevo, setModalNuevo] = useState(false);
  const [filtroEmp, setFiltroEmp] = useState("todas");
  const [buscar, setBuscar] = useState("");

  const rol = usuario?.rol;
  const esDirCeo = ["director","ceo"].includes(rol);
  const puedeEditar = !!permisoCrear;

  // ── Firestore: proyectos en tiempo real ──
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "proyectos"), snap => {
      setProyectos(snap.docs.map(d => d.data()).sort((a,b) => new Date(b.creadoEn||0) - new Date(a.creadoEn||0)));
    }, err => console.error("Firebase proyectos error:", err));
    return () => unsub();
  }, [db]);

  // ── Visibilidad por rol ──
  const visibles = useMemo(() => proyectos.filter(p => {
    if (esDirCeo || rol === "administrador") return true;
    if (rol === "encargado") return p.empresaId === usuario?.empresaId;
    // trabajador: proyectos de su empresa o donde figura como responsable de alguna tarea
    if (p.empresaId === usuario?.empresaId) return true;
    return (p.fases||[]).some(f => (f.tareas||[]).some(t => t.responsable && usuario?.nombre && t.responsable.includes(usuario.nombre.split(" ")[0])));
  }), [proyectos, rol, usuario, esDirCeo]);

  const filtrados = visibles
    .filter(p => filtroEmp === "todas" || p.empresaId === Number(filtroEmp))
    .filter(p => !buscar || p.nombre.toLowerCase().includes(buscar.toLowerCase()));

  // ── Persistencia ──
  const guardar = async (p) => { await setDoc(doc(db, "proyectos", String(p.id)), p); };
  const eliminar = async (id) => {
    if (!window.confirm("¿Eliminar este proyecto? No se puede deshacer.")) return;
    await deleteDoc(doc(db, "proyectos", String(id)));
    setAbierto(null);
  };

  const card = darkMode ? "#111827" : "#FFFFFF";
  const border = darkMode ? "#1E293B" : "#E2E8F0";
  const textPri = darkMode ? "#E2E8F0" : "#0F172A";
  const muted = darkMode ? "#64748B" : "#94A3B8";

  // KPIs
  const kpis = {
    total: visibles.length,
    progreso: visibles.filter(p => p.estado === "En progreso").length,
    completados: visibles.filter(p => p.estado === "Completado").length,
    avance: visibles.length ? Math.round(visibles.reduce((s,p)=>s+progresoProyecto(p),0)/visibles.length) : 0,
  };

  // ── Vista detalle (Gantt) ──
  const proyAbierto = proyectos.find(p => p.id === abierto);
  if (proyAbierto) {
    return <DetalleProyecto
      proyecto={proyAbierto} db={db} darkMode={darkMode} empColor={empColor}
      puedeEditar={puedeEditar} USUARIOS={USUARIOS} EMPRESAS={EMPRESAS}
      onVolver={() => setAbierto(null)} onGuardar={guardar} onEliminar={eliminar} />;
  }

  // ── Vista lista ──
  return (
    <div>
      <div className="page-header" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ margin:"0 0 4px", color:textPri, fontWeight:800, fontSize:18 }}>📊 Proyectos</h2>
          <p style={{ margin:0, color: muted, fontSize:13 }}>Cronogramas Gantt por proyecto y empresa</p>
        </div>
        {puedeEditar && (
          <div className="page-header-actions">
            <button onClick={() => setModalNuevo(true)}
              style={{ background: empColor, border:"none", borderRadius:8, padding:"10px 20px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              + Nuevo proyecto
            </button>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="stats-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        {[
          ["Total", kpis.total, "📊", "#3182CE"],
          ["En progreso", kpis.progreso, "🔵", "#3182CE"],
          ["Completados", kpis.completados, "✅", "#38A169"],
          ["Avance medio", kpis.avance + "%", "📈", empColor],
        ].map(([l,v,ic,col]) => (
          <div key={l} style={{ background:card, border:`1px solid ${border}`, borderRadius:12, padding:"14px 16px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <span style={{ fontSize:16 }}>{ic}</span>
              <span style={{ color:muted, fontSize:11, fontWeight:700, textTransform:"uppercase" }}>{l}</span>
            </div>
            <p style={{ margin:0, color:col, fontSize:24, fontWeight:900 }}>{v}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="filters-row" style={{ display:"flex", gap:10, marginBottom:16, alignItems:"center", flexWrap:"wrap" }}>
        <input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="🔍 Buscar proyecto..."
          style={{ fontFamily:"inherit", fontSize:13, background:card, border:`1px solid ${border}`, borderRadius:8, padding:"8px 12px", color:textPri, outline:"none", minWidth:220 }} />
        {esDirCeo && (
          <select value={filtroEmp} onChange={e=>setFiltroEmp(e.target.value)}
            style={{ fontFamily:"inherit", fontSize:13, background:card, border:`1px solid ${border}`, borderRadius:8, padding:"8px 12px", color:textPri, outline:"none" }}>
            <option value="todas">Todas las empresas</option>
            {EMPRESAS.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        )}
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div style={{ textAlign:"center", padding:"70px 20px" }}>
          <p style={{ fontSize:50, marginBottom:12 }}>📊</p>
          <p style={{ fontSize:15, fontWeight:700, color: muted }}>No hay proyectos todavía</p>
          {puedeEditar && <p style={{ fontSize:13, color: muted }}>Crea uno desde una plantilla o impórtalo desde Excel</p>}
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap:12 }}>
          {filtrados.map(p => {
            const emp = EMPRESAS.find(e => e.id === p.empresaId);
            const prog = progresoProyecto(p);
            const nT = (p.fases||[]).reduce((s,f)=>s+(f.tareas||[]).length,0);
            return (
              <div key={p.id} onClick={() => setAbierto(p.id)}
                style={{ background:card, border:`1px solid ${border}`, borderLeft:`4px solid ${emp?.color||empColor}`, borderRadius:12, padding:"16px 18px", cursor:"pointer" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:8 }}>
                  <p style={{ margin:0, color:textPri, fontSize:15, fontWeight:800, lineHeight:1.3 }}>{p.nombre}</p>
                  <span style={{ background: ESTADOS_PROY[p.estado]+"22", color: ESTADOS_PROY[p.estado], borderRadius:5, padding:"2px 8px", fontSize:10, fontWeight:800, whiteSpace:"nowrap" }}>{p.estado}</span>
                </div>
                <p style={{ margin:"0 0 12px", color:muted, fontSize:12 }}>
                  {emp && <span style={{ color: emp.color, fontWeight:700 }}>{emp.nombre}</span>} · {nT} tareas · {fmtES(p.fechaInicio)} → {fmtES(p.fechaFin)}
                </p>
                <div style={{ background: darkMode?"#0D1424":"#F1F5F9", borderRadius:6, height:8, overflow:"hidden" }}>
                  <div style={{ width:`${prog}%`, height:"100%", background: prog===100?"#38A169":(emp?.color||empColor), transition:"width .3s" }} />
                </div>
                <p style={{ margin:"6px 0 0", color:muted, fontSize:11, fontWeight:700, textAlign:"right" }}>{prog}%</p>
              </div>
            );
          })}
        </div>
      )}

      {modalNuevo && (
        <ModalNuevoProyecto darkMode={darkMode} empColor={empColor} usuario={usuario} usuarioId={usuarioId}
          esDirCeo={esDirCeo} EMPRESAS={EMPRESAS}
          onClose={() => setModalNuevo(false)}
          onCrear={async (p) => { await guardar(p); setModalNuevo(false); setAbierto(p.id); }} />
      )}
    </div>
  );
}

// ─── Modal: nuevo proyecto (blanco / plantilla / Excel) ─────
function ModalNuevoProyecto({ darkMode, empColor, usuario, usuarioId, esDirCeo, EMPRESAS, onClose, onCrear }) {
  const [modo, setModo] = useState("plantilla"); // plantilla | blanco | excel
  const [nombre, setNombre] = useState("");
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().slice(0,10));
  const [empresaId, setEmpresaId] = useState(esDirCeo ? 0 : (usuario?.empresaId ?? 0));
  const [tipoProyecto, setTipoProyecto] = useState("electrico"); // electrico | construccion
  const [plantillaId, setPlantillaId] = useState(PLANTILLAS[0]?.id || "");
  const [archivo, setArchivo] = useState(null);
  const [err, setErr] = useState("");

  const card = darkMode ? "#111827" : "#FFFFFF";
  const border = darkMode ? "#1E293B" : "#E2E8F0";
  const textPri = darkMode ? "#E2E8F0" : "#0F172A";
  const muted = darkMode ? "#64748B" : "#94A3B8";
  const inp = { fontFamily:"inherit", fontSize:13, background: darkMode?"#0D1424":"#FFFFFF", border:`1px solid ${border}`, borderRadius:8, padding:"9px 12px", color:textPri, outline:"none", width:"100%", boxSizing:"border-box" };
  const lbl = { display:"block", color:muted, fontSize:11, fontWeight:700, textTransform:"uppercase", marginBottom:6 };

  const crear = async () => {
    setErr("");
    const base = { empresaId: Number(empresaId), creadoPor: usuarioId };
    try {
      if (modo === "excel") {
        if (!archivo) return setErr("Selecciona un archivo Excel.");
        let XLSX;
        try { XLSX = await import("xlsx"); } catch { return setErr("Falta la librería 'xlsx'. Ejecuta: npm i xlsx"); }
        const buf = await archivo.arrayBuffer();
        const p = parseExcelCronograma(XLSX, buf, { ...base, nombre: nombre.trim() || archivo.name.replace(/\.xlsx?$/i,"") });
        p.id = genId();
        return onCrear(p);
      }
      if (!nombre.trim()) return setErr("Pon un nombre al proyecto.");
      let p;
      if (modo === "plantilla") {
        const pl = PLANTILLAS.find(x => x.id === plantillaId);
        p = crearProyectoDesdePlantilla(pl, { ...base, nombre: nombre.trim(), fechaInicio });
      } else {
        p = crearProyectoVacio({ ...base, nombre: nombre.trim(), fechaInicio });
      }
      p.id = genId();
      onCrear(p);
    } catch (e) { console.error(e); setErr("Error al crear el proyecto: " + e.message); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}
      style={{ position:"fixed", inset:0, background:"#0008", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, padding:16 }}>
      <div className="modal-box" onClick={e=>e.stopPropagation()}
        style={{ background:card, border:`1px solid ${border}`, borderRadius:16, padding:24, width:"min(460px,100%)", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <h3 style={{ margin:0, color:textPri, fontSize:16, fontWeight:800 }}>Nuevo proyecto</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", color:muted, cursor:"pointer", fontSize:22 }}>×</button>
        </div>

        {/* Selector de modo */}
        <div style={{ display:"flex", gap:6, marginBottom:18, background: darkMode?"#0D1424":"#F1F5F9", borderRadius:9, padding:3 }}>
          {[["plantilla","📋 Plantilla"],["blanco","➕ En blanco"],["excel","📥 Excel"]].map(([v,l]) => (
            <button key={v} onClick={()=>setModo(v)}
              style={{ flex:1, fontFamily:"inherit", fontSize:12, fontWeight:700, padding:"8px 6px", borderRadius:7, border:"none", cursor:"pointer",
                background: modo===v ? empColor : "transparent", color: modo===v ? "#fff" : muted }}>{l}</button>
          ))}
        </div>

        {modo !== "excel" && (
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Nombre del proyecto</label>
            <input style={inp} value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej. Nave industrial Miajadas" />
          </div>
        )}

        {modo === "plantilla" && (
          <>
            {/* Tipo de proyecto */}
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>Tipo de proyecto</label>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {TIPOS_PROYECTO.map(t => {
                  const sel = tipoProyecto === t.id;
                  return (
                    <button key={t.id}
                      onClick={() => {
                        setTipoProyecto(t.id);
                        const primera = PLANTILLAS.find(p => p.tipo === t.id);
                        if (primera) setPlantillaId(primera.id);
                      }}
                      style={{ fontFamily:"inherit", textAlign:"left", padding:"11px 12px", borderRadius:10, cursor:"pointer",
                        border:`1.5px solid ${sel ? t.color : border}`, background: sel ? t.color+"18" : "transparent" }}>
                      <div style={{ fontSize:13, fontWeight:800, color: sel ? t.color : textPri }}>{t.label}</div>
                      <div style={{ fontSize:10.5, color:muted, marginTop:2 }}>{t.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Plantillas del tipo seleccionado */}
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>Plantilla</label>
              <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                {PLANTILLAS.filter(p => p.tipo === tipoProyecto).map(p => {
                  const sel = plantillaId === p.id;
                  const nTareas = p.fases.reduce((s,f)=>s+f.tareas.length,0);
                  return (
                    <button key={p.id} onClick={()=>setPlantillaId(p.id)}
                      style={{ fontFamily:"inherit", textAlign:"left", padding:"11px 13px", borderRadius:10, cursor:"pointer",
                        border:`1.5px solid ${sel ? p.color : border}`, background: sel ? p.color+"12" : "transparent" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                        <span style={{ width:9, height:9, borderRadius:"50%", background:p.color, flexShrink:0 }} />
                        <span style={{ fontSize:13, fontWeight:800, color: sel ? p.color : textPri }}>{p.nombre}</span>
                      </div>
                      <div style={{ fontSize:11, color:muted, marginTop:4, lineHeight:1.4 }}>{p.descripcion}</div>
                      <div style={{ fontSize:10.5, color:muted, marginTop:5, fontWeight:700 }}>
                        {p.fases.length} fases · {nTareas} tareas · ~{p.duracionTotalDias} días
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {modo !== "excel" && (
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Fecha de inicio</label>
            <input type="date" style={inp} value={fechaInicio} onChange={e=>setFechaInicio(e.target.value)} />
          </div>
        )}

        {modo === "excel" && (
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Archivo Excel (columnas: Fase · Tarea / Actividad · Inicio · Fin · Responsable · % Avance)</label>
            <input type="file" accept=".xlsx,.xls" onChange={e=>setArchivo(e.target.files?.[0]||null)}
              style={{ ...inp, padding:"8px" }} />
            <div style={{ marginTop:14 }}>
              <label style={lbl}>Nombre (opcional)</label>
              <input style={inp} value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Se usa el nombre del archivo si lo dejas vacío" />
            </div>
          </div>
        )}

        {esDirCeo && (
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Empresa</label>
            <select style={inp} value={empresaId} onChange={e=>setEmpresaId(e.target.value)}>
              {EMPRESAS.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>
        )}

        {err && <p style={{ color:"#E53E3E", fontSize:12, margin:"0 0 12px" }}>{err}</p>}

        <div style={{ display:"flex", gap:10, marginTop:6 }}>
          <button onClick={onClose} style={{ flex:1, background:"transparent", border:`1px solid ${border}`, borderRadius:8, padding:"10px", color:muted, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Cancelar</button>
          <button onClick={crear} style={{ flex:2, background:empColor, border:"none", borderRadius:8, padding:"10px", color:"#fff", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>Crear proyecto</button>
        </div>
      </div>
    </div>
  );
}

// ─── Detalle del proyecto + Gantt ───────────────────────────
function DetalleProyecto({ proyecto, db, darkMode, empColor, puedeEditar, USUARIOS, EMPRESAS, onVolver, onGuardar, onEliminar }) {
  const [p, setP] = useState(proyecto);
  const [editTarea, setEditTarea] = useState(null); // { faseId, tarea } o { faseId, tarea:null } para nueva
  useEffect(() => { setP(proyecto); }, [proyecto.id]);

  const card = darkMode ? "#111827" : "#FFFFFF";
  const border = darkMode ? "#1E293B" : "#E2E8F0";
  const textPri = darkMode ? "#E2E8F0" : "#0F172A";
  const muted = darkMode ? "#64748B" : "#94A3B8";
  const emp = EMPRESAS.find(e => e.id === p.empresaId);

  // Recalcular rango y persistir
  const recalcRango = (proj) => {
    const todas = (proj.fases||[]).flatMap(f => f.tareas||[]);
    const inis = todas.map(t=>t.inicio).filter(Boolean).sort();
    const fins = todas.map(t=>t.fin).filter(Boolean).sort();
    return { ...proj, fechaInicio: inis[0] || proj.fechaInicio, fechaFin: fins.at(-1) || proj.fechaFin };
  };
  const persistir = (proj) => { const r = recalcRango(proj); setP(r); onGuardar(r); };

  const setEstado = (estado) => persistir({ ...p, estado });

  const guardarTarea = (faseId, datos, tareaId) => {
    const fases = p.fases.map(f => {
      if (f.id !== faseId) return f;
      if (tareaId) return { ...f, tareas: f.tareas.map(t => t.id===tareaId ? { ...t, ...datos } : t) };
      return { ...f, tareas: [...f.tareas, { id: genId(), dependencias:[], avance:0, ...datos }] };
    });
    persistir({ ...p, fases });
    setEditTarea(null);
  };
  const borrarTarea = (faseId, tareaId) => {
    const fases = p.fases.map(f => f.id===faseId ? { ...f, tareas: f.tareas.filter(t=>t.id!==tareaId) } : f);
    persistir({ ...p, fases });
    setEditTarea(null);
  };
  const addFase = () => {
    const nombre = window.prompt("Nombre de la nueva fase:");
    if (!nombre) return;
    persistir({ ...p, fases: [...(p.fases||[]), { id: genId(), nombre, color: emp?.color||empColor, tareas: [] }] });
  };
  const borrarFase = (faseId) => {
    if (!window.confirm("¿Eliminar la fase y todas sus tareas?")) return;
    persistir({ ...p, fases: p.fases.filter(f=>f.id!==faseId) });
  };

  const exportar = async () => {
    let XLSX;
    try { XLSX = await import("xlsx"); } catch { alert("Falta la librería 'xlsx'. Ejecuta: npm i xlsx"); return; }
    exportarProyectoExcel(XLSX, p);
  };

  const prog = progresoProyecto(p);

  return (
    <div>
      {/* Cabecera */}
      <div className="page-header" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16, flexWrap:"wrap", gap:12 }}>
        <div style={{ minWidth:0 }}>
          <button onClick={onVolver} style={{ background:"none", border:"none", color: empColor, cursor:"pointer", fontSize:13, fontWeight:700, padding:0, marginBottom:6 }}>← Volver a proyectos</button>
          <h2 style={{ margin:"0 0 4px", color:textPri, fontWeight:800, fontSize:18 }}>{p.nombre}</h2>
          <p style={{ margin:0, color:muted, fontSize:13 }}>
            {emp && <span style={{ color:emp.color, fontWeight:700 }}>{emp.nombre}</span>} · {fmtES(p.fechaInicio)} → {fmtES(p.fechaFin)} · {prog}% completado
          </p>
        </div>
        <div className="page-header-actions" style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {puedeEditar && (
            <select value={p.estado} onChange={e=>setEstado(e.target.value)}
              style={{ fontFamily:"inherit", fontSize:12, fontWeight:700, background:card, border:`1px solid ${border}`, borderRadius:8, padding:"8px 12px", color: ESTADOS_PROY[p.estado], outline:"none", cursor:"pointer" }}>
              {Object.keys(ESTADOS_PROY).map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          )}
          <button onClick={exportar} style={{ background:"#38A16922", border:"1px solid #38A16944", borderRadius:8, padding:"8px 14px", color:"#38A169", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>⬇️ Excel</button>
          {puedeEditar && <button onClick={()=>onEliminar(p.id)} style={{ background:"#E53E3E22", border:"1px solid #E53E3E44", borderRadius:8, padding:"8px 14px", color:"#E53E3E", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>🗑️ Eliminar</button>}
        </div>
      </div>

      {/* Gantt */}
      <GanttChart p={p} darkMode={darkMode} empColor={empColor}
        onEditarTarea={puedeEditar ? (faseId, tarea) => setEditTarea({ faseId, tarea }) : null}
        onBorrarFase={puedeEditar ? borrarFase : null} />

      {puedeEditar && (
        <button onClick={addFase} style={{ marginTop:14, background:"transparent", border:`1px dashed ${border}`, borderRadius:8, padding:"10px 16px", color:muted, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
          + Añadir fase
        </button>
      )}

      {editTarea && (
        <ModalEditarTarea darkMode={darkMode} empColor={empColor} USUARIOS={USUARIOS} empresaId={p.empresaId}
          fase={p.fases.find(f=>f.id===editTarea.faseId)} tarea={editTarea.tarea} fechaBaseProyecto={p.fechaInicio}
          onGuardar={(datos)=>guardarTarea(editTarea.faseId, datos, editTarea.tarea?.id)}
          onBorrar={editTarea.tarea ? ()=>borrarTarea(editTarea.faseId, editTarea.tarea.id) : null}
          onClose={()=>setEditTarea(null)} />
      )}
    </div>
  );
}

// ─── Gráfico Gantt ──────────────────────────────────────────
function GanttChart({ p, darkMode, empColor, onEditarTarea, onBorrarFase }) {
  const card = darkMode ? "#111827" : "#FFFFFF";
  const border = darkMode ? "#1E293B" : "#E2E8F0";
  const textPri = darkMode ? "#E2E8F0" : "#0F172A";
  const muted = darkMode ? "#64748B" : "#94A3B8";
  const grid = darkMode ? "#1E293B" : "#EEF2F7";

  const todas = (p.fases||[]).flatMap(f => f.tareas||[]).filter(t=>t.inicio && t.fin);
  if (todas.length === 0) {
    return <div style={{ background:card, border:`1px solid ${border}`, borderRadius:12, padding:"40px 20px", textAlign:"center", color:muted, fontSize:13 }}>
      Sin tareas todavía. {onEditarTarea && "Añade una fase y empieza a planificar."}
    </div>;
  }
  const ini = todas.map(t=>t.inicio).sort()[0];
  const fin = todas.map(t=>t.fin).sort().at(-1);
  const totalDias = Math.max(1, diffDias(ini, fin));
  const pxPorDia = 14;
  const anchoTimeline = totalDias * pxPorDia;
  const LABEL_W = 220;

  // Marcas de mes
  const marcas = [];
  let d = new Date(ini);
  while (d <= new Date(fin)) {
    const offset = diffDias(ini, d.toISOString().slice(0,10)) - 1;
    marcas.push({ left: offset * pxPorDia, label: `${MESES_ABR[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` });
    d.setMonth(d.getMonth()+1, 1);
  }
  const hoyOffset = (() => {
    const hoy = new Date().toISOString().slice(0,10);
    if (hoy < ini || hoy > fin) return null;
    return (diffDias(ini, hoy)-1) * pxPorDia;
  })();

  return (
    <div style={{ background:card, border:`1px solid ${border}`, borderRadius:12, overflow:"hidden" }}>
      <div style={{ overflowX:"auto" }}>
        <div style={{ minWidth: LABEL_W + anchoTimeline }}>
          {/* Cabecera meses */}
          <div style={{ display:"flex", borderBottom:`1px solid ${border}`, position:"sticky", top:0 }}>
            <div style={{ width:LABEL_W, flexShrink:0, padding:"8px 12px", color:muted, fontSize:11, fontWeight:700, textTransform:"uppercase", borderRight:`1px solid ${border}` }}>Tarea</div>
            <div style={{ position:"relative", height:34, width:anchoTimeline }}>
              {marcas.map((m,i)=>(
                <div key={i} style={{ position:"absolute", left:m.left, top:0, bottom:0, borderLeft:`1px solid ${grid}`, paddingLeft:6, color:muted, fontSize:10, fontWeight:700, display:"flex", alignItems:"center" }}>{m.label}</div>
              ))}
            </div>
          </div>

          {/* Filas por fase */}
          {(p.fases||[]).map(fase => (
            <div key={fase.id}>
              {/* Fila de fase */}
              <div style={{ display:"flex", background: darkMode?"#0D1424":"#F8FAFC", borderBottom:`1px solid ${border}` }}>
                <div style={{ width:LABEL_W, flexShrink:0, padding:"8px 12px", display:"flex", alignItems:"center", gap:8, borderRight:`1px solid ${border}` }}>
                  <span style={{ width:9, height:9, borderRadius:2, background: fase.color||empColor, flexShrink:0 }} />
                  <span style={{ color:textPri, fontSize:12, fontWeight:800, flex:1 }}>{fase.nombre}</span>
                  {onBorrarFase && <button onClick={()=>onBorrarFase(fase.id)} title="Eliminar fase" style={{ background:"none", border:"none", color:muted, cursor:"pointer", fontSize:12 }}>×</button>}
                </div>
                <div style={{ position:"relative", width:anchoTimeline, height:33 }}>
                  {hoyOffset!=null && <div style={{ position:"absolute", left:hoyOffset, top:0, bottom:0, width:2, background:"#E53E3E88" }} />}
                </div>
              </div>
              {/* Tareas */}
              {(fase.tareas||[]).map(t => {
                const tieneFechas = t.inicio && t.fin;
                const left = tieneFechas ? (diffDias(ini, t.inicio)-1)*pxPorDia : 0;
                const w = tieneFechas ? Math.max(pxPorDia, diffDias(t.inicio, t.fin)*pxPorDia) : 0;
                const completa = (t.avance||0) >= 100;
                return (
                  <div key={t.id} style={{ display:"flex", borderBottom:`1px solid ${grid}` }}>
                    <div onClick={onEditarTarea ? ()=>onEditarTarea(fase.id, t) : undefined}
                      style={{ width:LABEL_W, flexShrink:0, padding:"7px 12px 7px 28px", borderRight:`1px solid ${border}`, cursor: onEditarTarea?"pointer":"default" }}>
                      <p style={{ margin:0, color:textPri, fontSize:12, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{t.nombre}</p>
                      <p style={{ margin:0, color:muted, fontSize:10 }}>{t.responsable||"Sin asignar"}</p>
                    </div>
                    <div style={{ position:"relative", width:anchoTimeline, height:40, display:"flex", alignItems:"center" }}>
                      {marcas.map((m,i)=><div key={i} style={{ position:"absolute", left:m.left, top:0, bottom:0, borderLeft:`1px solid ${grid}` }} />)}
                      {hoyOffset!=null && <div style={{ position:"absolute", left:hoyOffset, top:0, bottom:0, width:2, background:"#E53E3E55" }} />}
                      {tieneFechas && (
                        <div onClick={onEditarTarea ? ()=>onEditarTarea(fase.id, t) : undefined}
                          title={`${t.nombre} · ${fmtES(t.inicio)} → ${fmtES(t.fin)} · ${t.avance||0}%`}
                          style={{ position:"absolute", left, width:w, height:22, borderRadius:6, background:(fase.color||empColor)+"33", border:`1px solid ${fase.color||empColor}`, overflow:"hidden", cursor:onEditarTarea?"pointer":"default" }}>
                          <div style={{ width:`${t.avance||0}%`, height:"100%", background: completa?"#38A169":(fase.color||empColor) }} />
                          <span style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", paddingLeft:6, color:"#fff", fontSize:10, fontWeight:700, whiteSpace:"nowrap", textShadow:"0 1px 2px #0006" }}>{t.avance||0}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {/* Añadir tarea a la fase */}
              {onEditarTarea && (
                <div style={{ display:"flex", borderBottom:`1px solid ${grid}` }}>
                  <div style={{ width:LABEL_W, flexShrink:0, padding:"5px 12px 5px 28px", borderRight:`1px solid ${border}` }}>
                    <button onClick={()=>onEditarTarea(fase.id, null)} style={{ background:"none", border:"none", color:muted, cursor:"pointer", fontSize:11, fontWeight:700, padding:0 }}>+ tarea</button>
                  </div>
                  <div style={{ width:anchoTimeline, height:28 }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Modal: editar / crear tarea ────────────────────────────
function ModalEditarTarea({ darkMode, empColor, USUARIOS, empresaId, fase, tarea, fechaBaseProyecto, onGuardar, onBorrar, onClose }) {
  const [nombre, setNombre] = useState(tarea?.nombre || "");
  const [inicio, setInicio] = useState(tarea?.inicio || fechaBaseProyecto || new Date().toISOString().slice(0,10));
  const [fin, setFin] = useState(tarea?.fin || addDias(tarea?.inicio || fechaBaseProyecto || new Date().toISOString().slice(0,10), 4));
  const [responsable, setResponsable] = useState(tarea?.responsable || "");
  const [avance, setAvance] = useState(tarea?.avance ?? 0);
  const [err, setErr] = useState("");

  const card = darkMode ? "#111827" : "#FFFFFF";
  const border = darkMode ? "#1E293B" : "#E2E8F0";
  const textPri = darkMode ? "#E2E8F0" : "#0F172A";
  const muted = darkMode ? "#64748B" : "#94A3B8";
  const inp = { fontFamily:"inherit", fontSize:13, background: darkMode?"#0D1424":"#FFFFFF", border:`1px solid ${border}`, borderRadius:8, padding:"9px 12px", color:textPri, outline:"none", width:"100%", boxSizing:"border-box" };
  const lbl = { display:"block", color:muted, fontSize:11, fontWeight:700, textTransform:"uppercase", marginBottom:6 };

  // Sugerencias de responsables: usuarios de la empresa del proyecto
  const sugeridos = USUARIOS.filter(u => u.empresaId === empresaId).map(u => u.nombre);

  const guardar = () => {
    if (!nombre.trim()) return setErr("Pon un nombre a la tarea.");
    if (new Date(fin) < new Date(inicio)) return setErr("La fecha de fin no puede ser anterior al inicio.");
    onGuardar({ nombre: nombre.trim(), inicio, fin, responsable: responsable.trim(), avance: Math.max(0, Math.min(100, Number(avance)||0)) });
  };

  return (
    <div className="modal-overlay" onClick={onClose}
      style={{ position:"fixed", inset:0, background:"#0008", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, padding:16 }}>
      <div className="modal-box" onClick={e=>e.stopPropagation()}
        style={{ background:card, border:`1px solid ${border}`, borderRadius:16, padding:24, width:"min(440px,100%)", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <h3 style={{ margin:0, color:textPri, fontSize:16, fontWeight:800 }}>{tarea ? "Editar tarea" : "Nueva tarea"}</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", color:muted, cursor:"pointer", fontSize:22 }}>×</button>
        </div>
        <p style={{ margin:"0 0 18px", color:muted, fontSize:12 }}>Fase: {fase?.nombre}</p>

        <div style={{ marginBottom:14 }}>
          <label style={lbl}>Nombre de la tarea</label>
          <input style={inp} value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej. Tendido de cables BT" />
        </div>
        <div className="form-grid-2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
          <div><label style={lbl}>Inicio</label><input type="date" style={inp} value={inicio} onChange={e=>setInicio(e.target.value)} /></div>
          <div><label style={lbl}>Fin</label><input type="date" style={inp} value={fin} onChange={e=>setFin(e.target.value)} /></div>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={lbl}>Responsable</label>
          <input style={inp} list="resp-sug" value={responsable} onChange={e=>setResponsable(e.target.value)} placeholder="Nombre o equipo" />
          <datalist id="resp-sug">{sugeridos.map((n,i)=><option key={i} value={n} />)}</datalist>
        </div>
        <div style={{ marginBottom:18 }}>
          <label style={lbl}>Avance: {avance}%</label>
          <input type="range" min={0} max={100} step={5} value={avance} onChange={e=>setAvance(e.target.value)} style={{ width:"100%", accentColor: empColor }} />
        </div>

        {err && <p style={{ color:"#E53E3E", fontSize:12, margin:"0 0 12px" }}>{err}</p>}

        <div style={{ display:"flex", gap:10 }}>
          {onBorrar && <button onClick={onBorrar} style={{ background:"#E53E3E22", border:"1px solid #E53E3E44", borderRadius:8, padding:"10px 14px", color:"#E53E3E", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>🗑️</button>}
          <button onClick={onClose} style={{ flex:1, background:"transparent", border:`1px solid ${border}`, borderRadius:8, padding:"10px", color:muted, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Cancelar</button>
          <button onClick={guardar} style={{ flex:2, background:empColor, border:"none", borderRadius:8, padding:"10px", color:"#fff", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
//  MÓDULO SALAS — Reserva de salas de reunión y formación
//  Horario: 08:00 – 15:00 · Cancelación: solo el creador
// ═══════════════════════════════════════════════════════════════

const SALAS = [
  { id: "juntas",     nombre: "Sala de Juntas",        icon: "🪑", color: "#3182CE" },
  { id: "formacion1", nombre: "Sala 1 de Formación",   icon: "📚", color: "#38A169" },
  { id: "formacion2", nombre: "Sala 2 de Formación",   icon: "🎓", color: "#805AD5" },
];

// IDs de usuarios con acceso al módulo de salas
const USUARIOS_SALAS_IDS = [7,1,0,2,3,35,17,18,19,43,42,44,45,46,11,12,13,14,15,16,8,9,10];

function horaToMin(h) {
  const [hh, mm] = h.split(":").map(Number);
  return hh * 60 + mm;
}
function minToHora(m) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
function solapan(r1, r2) {
  const ini1 = horaToMin(r1.horaInicio), fin1 = horaToMin(r1.horaFin);
  const ini2 = horaToMin(r2.horaInicio), fin2 = horaToMin(r2.horaFin);
  return ini1 < fin2 && fin1 > ini2;
}

// ── Componente principal de Salas ──────────────────────────────
function SeccionSalas({ db, darkMode, usuario, empColor }) {
  const [reservas,     setReservas]     = useState([]);
  const [fechaSel,     setFechaSel]     = useState(new Date().toISOString().split("T")[0]);
  const [modalNueva,   setModalNueva]   = useState(null);  // { salaId } | null
  const [verDetalle,   setVerDetalle]   = useState(null);  // reserva | null
  const [loading,      setLoading]      = useState(true);

  const dm      = darkMode;
  const cardBg  = dm ? "#111827" : "#FFFFFF";
  const border  = dm ? "#1E293B" : "#E2E8F0";
  const textPri = dm ? "#E2E8F0" : "#0F172A";
  const muted   = dm ? "#64748B" : "#94A3B8";
  const bg2     = dm ? "#0D1424" : "#F8FAFC";

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "reservasSalas"), snap => {
      setReservas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [db]);

  // Reservas del día seleccionado
  const reservasHoy = reservas.filter(r => r.fecha === fechaSel);

  const navFecha = (dir) => {
    const d = new Date(fechaSel + "T12:00:00");
    d.setDate(d.getDate() + dir);
    setFechaSel(d.toISOString().split("T")[0]);
  };

  const fechaLabel = new Date(fechaSel + "T12:00:00").toLocaleDateString("es-ES", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
  const esHoy = fechaSel === new Date().toISOString().split("T")[0];

  const cancelarReserva = async (r) => {
    if (!window.confirm(`¿Cancelar la reserva de "${SALAS.find(s => s.id === r.salaId)?.nombre}" el ${r.fecha} de ${r.horaInicio} a ${r.horaFin}?`)) return;
    await deleteDoc(doc(db, "reservasSalas", r.id));
    setVerDetalle(null);
  };

  // Franja horaria visual: 08:00 – 15:00
  const HORA_INI  = 8 * 60;  // 480 min
  const HORA_FIN  = 15 * 60; // 900 min
  const TOTAL_MIN = HORA_FIN - HORA_INI; // 420 min

  const pct = (h) => ((horaToMin(h) - HORA_INI) / TOTAL_MIN) * 100;

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Cabecera */}
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: "0 0 4px", color: textPri, fontWeight: 800, fontSize: 20 }}>🏛️ Reserva de Salas</h2>
        <p style={{ margin: 0, color: muted, fontSize: 13 }}>Gestión de salas compartidas · Horario 08:00 – 15:00</p>
      </div>

      {/* Navegador de fecha */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
        <button onClick={() => navFecha(-1)}
          style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 8, padding: "7px 12px", cursor: "pointer", color: textPri, fontSize: 15, fontFamily: "inherit" }}>‹</button>
        <input type="date" value={fechaSel} onChange={e => setFechaSel(e.target.value)}
          style={{ fontFamily: "inherit", fontSize: 13, background: cardBg, border: `1px solid ${border}`, borderRadius: 8, padding: "7px 12px", color: textPri, outline: "none", colorScheme: dm ? "dark" : "light" }} />
        <button onClick={() => navFecha(1)}
          style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 8, padding: "7px 12px", cursor: "pointer", color: textPri, fontSize: 15, fontFamily: "inherit" }}>›</button>
        <span style={{ color: textPri, fontSize: 14, fontWeight: 700, textTransform: "capitalize" }}>{fechaLabel}</span>
        {esHoy && <span style={{ background: empColor + "22", color: empColor, border: `1px solid ${empColor}44`, borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>Hoy</span>}
        <button onClick={() => setFechaSel(new Date().toISOString().split("T")[0])}
          style={{ marginLeft: "auto", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer", color: muted, fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>
          Ir a hoy
        </button>
      </div>

      {/* Tarjetas de salas */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: muted }}>Cargando reservas...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {SALAS.map(sala => {
            const reservasSala = reservasHoy.filter(r => r.salaId === sala.id).sort((a, b) => horaToMin(a.horaInicio) - horaToMin(b.horaInicio));
            return (
              <div key={sala.id} style={{ background: cardBg, border: `1px solid ${sala.color}44`, borderRadius: 14, overflow: "hidden" }}>
                {/* Header de sala */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${border}`, background: sala.color + "11" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{sala.icon}</span>
                    <div>
                      <p style={{ margin: 0, color: sala.color, fontWeight: 800, fontSize: 15 }}>{sala.nombre}</p>
                      <p style={{ margin: 0, color: muted, fontSize: 11 }}>
                        {reservasSala.length === 0 ? "Libre todo el día" : `${reservasSala.length} reserva${reservasSala.length > 1 ? "s" : ""}`}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setModalNueva({ salaId: sala.id })}
                    style={{ fontFamily: "inherit", fontSize: 12, fontWeight: 700, padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: sala.color, color: "#fff" }}>
                    + Reservar
                  </button>
                </div>

                {/* Timeline visual 08:00–15:00 */}
                <div style={{ padding: "16px 20px" }}>
                  {/* Horas */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    {[8, 9, 10, 11, 12, 13, 14, 15].map(h => (
                      <span key={h} style={{ color: muted, fontSize: 10, fontWeight: 600 }}>{String(h).padStart(2,"0")}:00</span>
                    ))}
                  </div>

                  {/* Barra de disponibilidad */}
                  <div style={{ position: "relative", height: 36, background: dm ? "#1A2235" : "#F0F7FF", borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
                    {/* Línea de hora actual */}
                    {esHoy && (() => {
                      const ahora = new Date();
                      const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
                      if (minAhora < HORA_INI || minAhora > HORA_FIN) return null;
                      const left = pct(minToHora(minAhora));
                      return <div style={{ position: "absolute", left: `${left}%`, top: 0, bottom: 0, width: 2, background: "#E53E3E", zIndex: 3 }} />;
                    })()}
                    {/* Bloques ocupados */}
                    {reservasSala.map(r => {
                      const left  = pct(r.horaInicio);
                      const width = ((horaToMin(r.horaFin) - horaToMin(r.horaInicio)) / TOTAL_MIN) * 100;
                      const esMia = r.usuarioId === usuario?.id;
                      return (
                        <div key={r.id} onClick={() => setVerDetalle(r)}
                          title={`${r.usuarioNombre} · ${r.horaInicio}–${r.horaFin}${r.motivo ? ` · ${r.motivo}` : ""}`}
                          style={{ position: "absolute", left: `${left}%`, width: `${width}%`, top: 4, bottom: 4, borderRadius: 5, background: esMia ? sala.color : sala.color + "88", border: `1px solid ${sala.color}`, cursor: "pointer", display: "flex", alignItems: "center", paddingLeft: 6, overflow: "hidden", zIndex: 2 }}>
                          <span style={{ color: "#fff", fontSize: 9, fontWeight: 700, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                            {esMia ? "Yo" : r.usuarioNombre?.split(" ")[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Lista de reservas del día */}
                  {reservasSala.length === 0 ? (
                    <p style={{ margin: 0, color: muted, fontSize: 12, fontStyle: "italic" }}>Sin reservas para este día. ¡Disponible todo el horario!</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {reservasSala.map(r => {
                        const esMia    = r.usuarioId === usuario?.id;
                        const userInfo = USUARIOS.find(u => u.id === r.usuarioId);
                        const emp      = EMPRESAS.find(e => e.id === userInfo?.empresaId);
                        return (
                          <div key={r.id} onClick={() => setVerDetalle(r)}
                            style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: esMia ? sala.color + "18" : (dm ? "#1A2235" : "#F8FAFC"), borderRadius: 8, border: `1px solid ${esMia ? sala.color + "44" : border}`, cursor: "pointer" }}>
                            <span style={{ color: sala.color, fontSize: 13, fontWeight: 800, minWidth: 100 }}>{r.horaInicio} – {r.horaFin}</span>
                            <div style={{ width: 28, height: 28, borderRadius: "50%", background: (emp?.color || sala.color) + "33", border: `1.5px solid ${emp?.color || sala.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: emp?.color || sala.color, flexShrink: 0 }}>
                              {r.usuarioNombre?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, color: textPri, fontSize: 12, fontWeight: esMia ? 700 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {r.usuarioNombre} {esMia && <span style={{ color: sala.color, fontSize: 10 }}>(tú)</span>}
                              </p>
                              {r.motivo && <p style={{ margin: 0, color: muted, fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.motivo}</p>}
                            </div>
                            {esMia && (
                              <span style={{ background: sala.color + "22", color: sala.color, border: `1px solid ${sala.color}44`, borderRadius: 5, padding: "2px 8px", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>Tu reserva</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal nueva reserva */}
      {modalNueva && (
        <ModalNuevaReserva
          db={db}
          darkMode={dm}
          usuario={usuario}
          empColor={empColor}
          salaId={modalNueva.salaId}
          fechaDefault={fechaSel}
          reservasExistentes={reservas}
          onClose={() => setModalNueva(null)}
        />
      )}

      {/* Modal detalle */}
      {verDetalle && (
        <ModalDetalleReserva
          db={db}
          darkMode={dm}
          reserva={verDetalle}
          usuario={usuario}
          empColor={empColor}
          onClose={() => setVerDetalle(null)}
          onCancelar={() => cancelarReserva(verDetalle)}
        />
      )}
    </div>
  );
}

// ── Modal: nueva reserva ────────────────────────────────────────
function ModalNuevaReserva({ db, darkMode, usuario, empColor, salaId, fechaDefault, reservasExistentes, onClose }) {
  const sala = SALAS.find(s => s.id === salaId);
  const dm   = darkMode;

  const hoyStr = new Date().toISOString().split("T")[0];

  const [fecha,      setFecha]      = useState(fechaDefault || hoyStr);
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFin,    setHoraFin]    = useState("09:00");
  const [motivo,     setMotivo]     = useState("");
  const [error,      setError]      = useState("");
  const [guardando,  setGuardando]  = useState(false);

  const card   = dm ? "#111827" : "#FFFFFF";
  const border = dm ? "#2E3A55" : "#E2E8F0";
  const text   = dm ? "#E2E8F0" : "#0F172A";
  const muted  = dm ? "#64748B" : "#94A3B8";
  const inp    = { fontFamily: "inherit", fontSize: 13, background: dm ? "#1A2235" : "#F8FAFC", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: text, outline: "none", width: "100%", boxSizing: "border-box", colorScheme: dm ? "dark" : "light" };
  const lbl    = { display: "block", color: muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 };


  const validar = () => {
    if (!fecha) return "Selecciona una fecha.";
    if (fecha < hoyStr) return "No puedes reservar en el pasado.";
    const ini = horaToMin(horaInicio);
    const fin = horaToMin(horaFin);
    if (fin <= ini) return "La hora de fin debe ser posterior a la hora de inicio.";
    if (ini < 8 * 60 || fin > 15 * 60) return "El horario disponible es de 08:00 a 15:00.";
    // Comprobar solapamiento
    const reservasSala = reservasExistentes.filter(r => r.salaId === salaId && r.fecha === fecha);
    const nueva = { horaInicio, horaFin };
    const conflicto = reservasSala.find(r => solapan(nueva, r));
    if (conflicto) return `Conflicto con reserva de ${conflicto.usuarioNombre} (${conflicto.horaInicio}–${conflicto.horaFin}).`;
    return null;
  };

  const guardar = async () => {
    const err = validar();
    if (err) { setError(err); return; }
    setGuardando(true);
    try {
      const id = "res_" + Date.now();
      await setDoc(doc(db, "reservasSalas", id), {
        id,
        salaId,
        fecha,
        horaInicio,
        horaFin,
        motivo:       motivo.trim() || null,
        usuarioId:    usuario.id,
        usuarioNombre: usuario.nombre,
        empresaId:    usuario.empresaId,
        creadoEn:     new Date().toISOString(),
      });
      onClose();
    } catch (e) {
      setError("Error al guardar. Inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000099", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }} onMouseDown={onClose}>
      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, width: "100%", maxWidth: 460, padding: 28, boxShadow: "0 24px 80px #0009" }} onMouseDown={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, color: sala.color, fontSize: 17, fontWeight: 800 }}>{sala.icon} {sala.nombre}</h3>
            <p style={{ margin: "3px 0 0", color: muted, fontSize: 12 }}>Nueva reserva</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: muted, fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Fecha */}
          <div>
            <label style={lbl}>📅 Fecha</label>
            <input type="date" style={inp} value={fecha} min={hoyStr} onChange={e => { setFecha(e.target.value); setError(""); }} />
          </div>

          {/* Horas */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>⏰ Hora inicio</label>
              <input type="time" style={inp} value={horaInicio} min="08:00" max="14:59"
                onChange={e => { setHoraInicio(e.target.value); setError(""); }} />
            </div>
            <div>
              <label style={lbl}>⏰ Hora fin</label>
              <input type="time" style={inp} value={horaFin} min="08:01" max="15:00"
                onChange={e => { setHoraFin(e.target.value); setError(""); }} />
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label style={lbl}>📝 Motivo (opcional)</label>
            <input style={inp} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej: Reunión de equipo, Formación..." maxLength={100} />
          </div>

          {/* Info duración */}
          {horaInicio && horaFin && horaToMin(horaFin) > horaToMin(horaInicio) && (
            <div style={{ background: sala.color + "11", border: `1px solid ${sala.color}33`, borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>⏱️</span>
              <span style={{ color: sala.color, fontSize: 13, fontWeight: 700 }}>
                {horaInicio} – {horaFin} · {Math.round((horaToMin(horaFin) - horaToMin(horaInicio)) / 60 * 10) / 10}h
              </span>
            </div>
          )}

          {error && <p style={{ margin: 0, color: "#E53E3E", fontSize: 12, fontWeight: 600 }}>⚠️ {error}</p>}

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, fontFamily: "inherit", fontSize: 13, fontWeight: 700, padding: "10px", borderRadius: 8, border: `1px solid ${border}`, cursor: "pointer", background: "transparent", color: muted }}>Cancelar</button>
            <button onClick={guardar} disabled={guardando}
              style={{ flex: 2, fontFamily: "inherit", fontSize: 13, fontWeight: 800, padding: "10px", borderRadius: 8, border: "none", cursor: guardando ? "default" : "pointer", background: guardando ? sala.color + "88" : sala.color, color: "#fff" }}>
              {guardando ? "Guardando..." : "✓ Confirmar reserva"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal: detalle de reserva ───────────────────────────────────
function ModalDetalleReserva({ db, darkMode, reserva, usuario, empColor, onClose, onCancelar }) {
  const dm     = darkMode;
  const sala   = SALAS.find(s => s.id === reserva.salaId);
  const card   = dm ? "#111827" : "#FFFFFF";
  const border = dm ? "#2E3A55" : "#E2E8F0";
  const text   = dm ? "#E2E8F0" : "#0F172A";
  const muted  = dm ? "#64748B" : "#94A3B8";

  const esMia  = reserva.usuarioId === usuario?.id;
  const emp    = EMPRESAS.find(e => e.id === reserva.empresaId);
  const durMin = horaToMin(reserva.horaFin) - horaToMin(reserva.horaInicio);
  const durStr = durMin >= 60 ? `${Math.floor(durMin/60)}h${durMin%60>0?` ${durMin%60}min`:""}` : `${durMin}min`;

  const fechaFmt = new Date(reserva.fecha + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000099", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }} onMouseDown={onClose}>
      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, width: "100%", maxWidth: 420, padding: 28, boxShadow: "0 24px 80px #0009" }} onMouseDown={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: sala.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{sala.icon}</div>
            <div>
              <h3 style={{ margin: 0, color: sala.color, fontSize: 16, fontWeight: 800 }}>{sala.nombre}</h3>
              <p style={{ margin: 0, color: muted, fontSize: 12 }}>Detalles de la reserva</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: muted, fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Fecha */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 14px", background: dm ? "#1A2235" : "#F8FAFC", borderRadius: 8, border: `1px solid ${border}` }}>
            <span style={{ fontSize: 18 }}>📅</span>
            <div>
              <p style={{ margin: 0, color: muted, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Fecha</p>
              <p style={{ margin: 0, color: text, fontSize: 13, fontWeight: 700, textTransform: "capitalize" }}>{fechaFmt}</p>
            </div>
          </div>

          {/* Horario */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 14px", background: sala.color + "11", borderRadius: 8, border: `1px solid ${sala.color}33` }}>
            <span style={{ fontSize: 18 }}>⏰</span>
            <div>
              <p style={{ margin: 0, color: muted, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Horario</p>
              <p style={{ margin: 0, color: sala.color, fontSize: 15, fontWeight: 800 }}>{reserva.horaInicio} – {reserva.horaFin} <span style={{ fontSize: 12, fontWeight: 600 }}>({durStr})</span></p>
            </div>
          </div>

          {/* Reservado por */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 14px", background: dm ? "#1A2235" : "#F8FAFC", borderRadius: 8, border: `1px solid ${border}` }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: (emp?.color || empColor) + "33", border: `1.5px solid ${emp?.color || empColor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: emp?.color || empColor, flexShrink: 0 }}>
              {reserva.usuarioNombre?.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()||"?"}
            </div>
            <div>
              <p style={{ margin: 0, color: muted, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Reservado por</p>
              <p style={{ margin: 0, color: text, fontSize: 13, fontWeight: 700 }}>{reserva.usuarioNombre} {esMia && <span style={{ color: sala.color, fontSize: 11 }}>(tú)</span>}</p>
              {emp && <p style={{ margin: 0, color: emp.color, fontSize: 11 }}>{emp.nombre}</p>}
            </div>
          </div>

          {/* Motivo */}
          {reserva.motivo && (
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 14px", background: dm ? "#1A2235" : "#F8FAFC", borderRadius: 8, border: `1px solid ${border}` }}>
              <span style={{ fontSize: 18 }}>📝</span>
              <div>
                <p style={{ margin: 0, color: muted, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Motivo</p>
                <p style={{ margin: 0, color: text, fontSize: 13 }}>{reserva.motivo}</p>
              </div>
            </div>
          )}
        </div>

        {/* Botones */}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, fontFamily: "inherit", fontSize: 13, fontWeight: 700, padding: "10px", borderRadius: 8, border: `1px solid ${border}`, cursor: "pointer", background: "transparent", color: muted }}>Cerrar</button>
          {esMia && (
            <button onClick={onCancelar}
              style={{ flex: 1, fontFamily: "inherit", fontSize: 13, fontWeight: 800, padding: "10px", borderRadius: 8, cursor: "pointer", background: "#E53E3E22", color: "#E53E3E", border: "1px solid #E53E3E44" }}>
              🗑️ Cancelar reserva
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
//  MÓDULO COCHES — Reserva de vehículos de empresa
//  Horario: libre (24h) · Cancelación: creador + responsables del coche
// ═══════════════════════════════════════════════════════════════

const COCHES = [
  { id: "auris",       nombre: "Toyota Auris",       icon: "🚗", color: "#2B6CB0", responsables: [11, 12]     },
  { id: "bigster",     nombre: "Dacia Bigster",      icon: "🚙", color: "#C05621", responsables: [11, 12, 15] },
  { id: "landcruiser", nombre: "Toyota LandCruiser", icon: "🛻", color: "#2F855A", responsables: [8]          },
];

// Mismos usuarios con acceso que el módulo de Salas
const USUARIOS_COCHES_IDS = USUARIOS_SALAS_IDS;

// ¿Puede el usuario cancelar esta reserva? (creador o responsable del coche)
function puedeCancelarCoche(reserva, usuario) {
  if (!usuario) return false;
  if (reserva.usuarioId === usuario.id) return true;
  const coche = COCHES.find(c => c.id === reserva.cocheId);
  return !!coche && coche.responsables.includes(usuario.id);
}

// ── Componente principal de Coches ─────────────────────────────
function SeccionCoches({ db, darkMode, usuario, empColor }) {
  const [reservas,   setReservas]   = useState([]);
  const [fechaSel,   setFechaSel]   = useState(new Date().toISOString().split("T")[0]);
  const [modalNueva, setModalNueva] = useState(null);  // { cocheId } | null
  const [verDetalle, setVerDetalle] = useState(null);  // reserva | null
  const [loading,    setLoading]    = useState(true);

  const dm      = darkMode;
  const cardBg  = dm ? "#111827" : "#FFFFFF";
  const border  = dm ? "#1E293B" : "#E2E8F0";
  const textPri = dm ? "#E2E8F0" : "#0F172A";
  const muted   = dm ? "#64748B" : "#94A3B8";

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "reservasCoches"), snap => {
      setReservas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [db]);

  const reservasHoy = reservas.filter(r => r.fecha === fechaSel);

  const navFecha = (dir) => {
    const d = new Date(fechaSel + "T12:00:00");
    d.setDate(d.getDate() + dir);
    setFechaSel(d.toISOString().split("T")[0]);
  };

  const fechaLabel = new Date(fechaSel + "T12:00:00").toLocaleDateString("es-ES", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
  const esHoy = fechaSel === new Date().toISOString().split("T")[0];

  const cancelarReserva = async (r) => {
    if (!puedeCancelarCoche(r, usuario)) return;
    if (!window.confirm(`¿Cancelar la reserva de "${COCHES.find(c => c.id === r.cocheId)?.nombre}" el ${r.fecha} de ${r.horaInicio} a ${r.horaFin}?`)) return;
    await deleteDoc(doc(db, "reservasCoches", r.id));
    setVerDetalle(null);
  };

  // Franja horaria visual: 00:00 – 24:00 (libre)
  const HORA_INI  = 0;
  const HORA_FIN  = 24 * 60;  // 1440 min
  const TOTAL_MIN = HORA_FIN - HORA_INI;
  const MARCAS    = [0, 3, 6, 9, 12, 15, 18, 21, 24];

  const pct = (h) => ((horaToMin(h) - HORA_INI) / TOTAL_MIN) * 100;

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Cabecera */}
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: "0 0 4px", color: textPri, fontWeight: 800, fontSize: 20 }}>🚗 Reserva de Coches</h2>
        <p style={{ margin: 0, color: muted, fontSize: 13 }}>Gestión de vehículos compartidos · Horario libre</p>
      </div>

      {/* Navegador de fecha */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
        <button onClick={() => navFecha(-1)}
          style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 8, padding: "7px 12px", cursor: "pointer", color: textPri, fontSize: 15, fontFamily: "inherit" }}>‹</button>
        <input type="date" value={fechaSel} onChange={e => setFechaSel(e.target.value)}
          style={{ fontFamily: "inherit", fontSize: 13, background: cardBg, border: `1px solid ${border}`, borderRadius: 8, padding: "7px 12px", color: textPri, outline: "none", colorScheme: dm ? "dark" : "light" }} />
        <button onClick={() => navFecha(1)}
          style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 8, padding: "7px 12px", cursor: "pointer", color: textPri, fontSize: 15, fontFamily: "inherit" }}>›</button>
        <span style={{ color: textPri, fontSize: 14, fontWeight: 700, textTransform: "capitalize" }}>{fechaLabel}</span>
        {esHoy && <span style={{ background: empColor + "22", color: empColor, border: `1px solid ${empColor}44`, borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>Hoy</span>}
        <button onClick={() => setFechaSel(new Date().toISOString().split("T")[0])}
          style={{ marginLeft: "auto", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer", color: muted, fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>
          Ir a hoy
        </button>
      </div>

      {/* Tarjetas de coches */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: muted }}>Cargando reservas...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {COCHES.map(coche => {
            const reservasCoche = reservasHoy.filter(r => r.cocheId === coche.id).sort((a, b) => horaToMin(a.horaInicio) - horaToMin(b.horaInicio));
            const nombresResp = coche.responsables.map(rid => USUARIOS.find(u => u.id === rid)?.nombre?.split(" ").slice(0, 2).join(" ")).filter(Boolean);
            return (
              <div key={coche.id} style={{ background: cardBg, border: `1px solid ${coche.color}44`, borderRadius: 14, overflow: "hidden" }}>
                {/* Header de coche */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${border}`, background: coche.color + "11" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{coche.icon}</span>
                    <div>
                      <p style={{ margin: 0, color: coche.color, fontWeight: 800, fontSize: 15 }}>{coche.nombre}</p>
                      <p style={{ margin: 0, color: muted, fontSize: 11 }}>
                        {reservasCoche.length === 0 ? "Libre todo el día" : `${reservasCoche.length} reserva${reservasCoche.length > 1 ? "s" : ""}`}
                        {nombresResp.length > 0 && <span> · Resp.: {nombresResp.join(", ")}</span>}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setModalNueva({ cocheId: coche.id })}
                    style={{ fontFamily: "inherit", fontSize: 12, fontWeight: 700, padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: coche.color, color: "#fff" }}>
                    + Reservar
                  </button>
                </div>

                {/* Timeline visual 00:00–24:00 */}
                <div style={{ padding: "16px 20px" }}>
                  {/* Horas */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    {MARCAS.map(h => (
                      <span key={h} style={{ color: muted, fontSize: 10, fontWeight: 600 }}>{String(h).padStart(2,"0")}:00</span>
                    ))}
                  </div>

                  {/* Barra de disponibilidad */}
                  <div style={{ position: "relative", height: 36, background: dm ? "#1A2235" : "#F0F7FF", borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
                    {/* Línea de hora actual */}
                    {esHoy && (() => {
                      const ahora = new Date();
                      const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
                      const left = pct(minToHora(minAhora));
                      return <div style={{ position: "absolute", left: `${left}%`, top: 0, bottom: 0, width: 2, background: "#E53E3E", zIndex: 3 }} />;
                    })()}
                    {/* Bloques ocupados */}
                    {reservasCoche.map(r => {
                      const left  = pct(r.horaInicio);
                      const width = ((horaToMin(r.horaFin) - horaToMin(r.horaInicio)) / TOTAL_MIN) * 100;
                      const esMia = r.usuarioId === usuario?.id;
                      return (
                        <div key={r.id} onClick={() => setVerDetalle(r)}
                          title={`${r.usuarioNombre} · ${r.horaInicio}–${r.horaFin}${r.motivo ? ` · ${r.motivo}` : ""}`}
                          style={{ position: "absolute", left: `${left}%`, width: `${width}%`, top: 4, bottom: 4, borderRadius: 5, background: esMia ? coche.color : coche.color + "88", border: `1px solid ${coche.color}`, cursor: "pointer", display: "flex", alignItems: "center", paddingLeft: 6, overflow: "hidden", zIndex: 2 }}>
                          <span style={{ color: "#fff", fontSize: 9, fontWeight: 700, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                            {esMia ? "Yo" : r.usuarioNombre?.split(" ")[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Lista de reservas del día */}
                  {reservasCoche.length === 0 ? (
                    <p style={{ margin: 0, color: muted, fontSize: 12, fontStyle: "italic" }}>Sin reservas para este día. ¡Disponible a cualquier hora!</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {reservasCoche.map(r => {
                        const esMia    = r.usuarioId === usuario?.id;
                        const userInfo = USUARIOS.find(u => u.id === r.usuarioId);
                        const emp      = EMPRESAS.find(e => e.id === userInfo?.empresaId);
                        return (
                          <div key={r.id} onClick={() => setVerDetalle(r)}
                            style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: esMia ? coche.color + "18" : (dm ? "#1A2235" : "#F8FAFC"), borderRadius: 8, border: `1px solid ${esMia ? coche.color + "44" : border}`, cursor: "pointer" }}>
                            <span style={{ color: coche.color, fontSize: 13, fontWeight: 800, minWidth: 100 }}>{r.horaInicio} – {r.horaFin}</span>
                            <div style={{ width: 28, height: 28, borderRadius: "50%", background: (emp?.color || coche.color) + "33", border: `1.5px solid ${emp?.color || coche.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: emp?.color || coche.color, flexShrink: 0 }}>
                              {r.usuarioNombre?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, color: textPri, fontSize: 12, fontWeight: esMia ? 700 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {r.usuarioNombre} {esMia && <span style={{ color: coche.color, fontSize: 10 }}>(tú)</span>}
                              </p>
                              {r.motivo && <p style={{ margin: 0, color: muted, fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.motivo}</p>}
                            </div>
                            {esMia && (
                              <span style={{ background: coche.color + "22", color: coche.color, border: `1px solid ${coche.color}44`, borderRadius: 5, padding: "2px 8px", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>Tu reserva</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal nueva reserva */}
      {modalNueva && (
        <ModalNuevaReservaCoche
          db={db}
          darkMode={dm}
          usuario={usuario}
          empColor={empColor}
          cocheId={modalNueva.cocheId}
          fechaDefault={fechaSel}
          reservasExistentes={reservas}
          onClose={() => setModalNueva(null)}
        />
      )}

      {/* Modal detalle */}
      {verDetalle && (
        <ModalDetalleReservaCoche
          db={db}
          darkMode={dm}
          reserva={verDetalle}
          usuario={usuario}
          empColor={empColor}
          onClose={() => setVerDetalle(null)}
          onCancelar={() => cancelarReserva(verDetalle)}
        />
      )}
    </div>
  );
}

// ── Modal: nueva reserva de coche ───────────────────────────────
function ModalNuevaReservaCoche({ db, darkMode, usuario, empColor, cocheId, fechaDefault, reservasExistentes, onClose }) {
  const coche = COCHES.find(c => c.id === cocheId);
  const dm    = darkMode;

  const hoyStr = new Date().toISOString().split("T")[0];

  const [fecha,      setFecha]      = useState(fechaDefault || hoyStr);
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFin,    setHoraFin]    = useState("10:00");
  const [motivo,     setMotivo]     = useState("");
  const [error,      setError]      = useState("");
  const [guardando,  setGuardando]  = useState(false);

  const card   = dm ? "#111827" : "#FFFFFF";
  const border = dm ? "#2E3A55" : "#E2E8F0";
  const text   = dm ? "#E2E8F0" : "#0F172A";
  const muted  = dm ? "#64748B" : "#94A3B8";
  const inp    = { fontFamily: "inherit", fontSize: 13, background: dm ? "#1A2235" : "#F8FAFC", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: text, outline: "none", width: "100%", boxSizing: "border-box", colorScheme: dm ? "dark" : "light" };
  const lbl    = { display: "block", color: muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 };

  const validar = () => {
    if (!fecha) return "Selecciona una fecha.";
    if (fecha < hoyStr) return "No puedes reservar en el pasado.";
    const ini = horaToMin(horaInicio);
    const fin = horaToMin(horaFin);
    if (fin <= ini) return "La hora de fin debe ser posterior a la hora de inicio.";
    // Comprobar solapamiento (mismo coche, misma fecha)
    const reservasCoche = reservasExistentes.filter(r => r.cocheId === cocheId && r.fecha === fecha);
    const nueva = { horaInicio, horaFin };
    const conflicto = reservasCoche.find(r => solapan(nueva, r));
    if (conflicto) return `Conflicto con reserva de ${conflicto.usuarioNombre} (${conflicto.horaInicio}–${conflicto.horaFin}).`;
    return null;
  };

  const guardar = async () => {
    const err = validar();
    if (err) { setError(err); return; }
    setGuardando(true);
    try {
      const id = "resc_" + Date.now();
      await setDoc(doc(db, "reservasCoches", id), {
        id,
        cocheId,
        fecha,
        horaInicio,
        horaFin,
        motivo:        motivo.trim() || null,
        usuarioId:     usuario.id,
        usuarioNombre: usuario.nombre,
        empresaId:     usuario.empresaId,
        creadoEn:      new Date().toISOString(),
      });
      onClose();
    } catch (e) {
      setError("Error al guardar. Inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000099", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }} onMouseDown={onClose}>
      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, width: "100%", maxWidth: 460, padding: 28, boxShadow: "0 24px 80px #0009" }} onMouseDown={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, color: coche.color, fontSize: 17, fontWeight: 800 }}>{coche.icon} {coche.nombre}</h3>
            <p style={{ margin: "3px 0 0", color: muted, fontSize: 12 }}>Nueva reserva</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: muted, fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Fecha */}
          <div>
            <label style={lbl}>📅 Fecha</label>
            <input type="date" style={inp} value={fecha} min={hoyStr} onChange={e => { setFecha(e.target.value); setError(""); }} />
          </div>

          {/* Horas (libre) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>⏰ Hora inicio</label>
              <input type="time" style={inp} value={horaInicio}
                onChange={e => { setHoraInicio(e.target.value); setError(""); }} />
            </div>
            <div>
              <label style={lbl}>⏰ Hora fin</label>
              <input type="time" style={inp} value={horaFin}
                onChange={e => { setHoraFin(e.target.value); setError(""); }} />
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label style={lbl}>📝 Motivo (opcional)</label>
            <input style={inp} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej: Visita a obra, Desplazamiento cliente..." maxLength={100} />
          </div>

          {/* Info duración */}
          {horaInicio && horaFin && horaToMin(horaFin) > horaToMin(horaInicio) && (
            <div style={{ background: coche.color + "11", border: `1px solid ${coche.color}33`, borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>⏱️</span>
              <span style={{ color: coche.color, fontSize: 13, fontWeight: 700 }}>
                {horaInicio} – {horaFin} · {Math.round((horaToMin(horaFin) - horaToMin(horaInicio)) / 60 * 10) / 10}h
              </span>
            </div>
          )}

          {error && <p style={{ margin: 0, color: "#E53E3E", fontSize: 12, fontWeight: 600 }}>⚠️ {error}</p>}

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, fontFamily: "inherit", fontSize: 13, fontWeight: 700, padding: "10px", borderRadius: 8, border: `1px solid ${border}`, cursor: "pointer", background: "transparent", color: muted }}>Cancelar</button>
            <button onClick={guardar} disabled={guardando}
              style={{ flex: 2, fontFamily: "inherit", fontSize: 13, fontWeight: 800, padding: "10px", borderRadius: 8, border: "none", cursor: guardando ? "default" : "pointer", background: guardando ? coche.color + "88" : coche.color, color: "#fff" }}>
              {guardando ? "Guardando..." : "✓ Confirmar reserva"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal: detalle de reserva de coche ──────────────────────────
function ModalDetalleReservaCoche({ db, darkMode, reserva, usuario, empColor, onClose, onCancelar }) {
  const dm     = darkMode;
  const coche  = COCHES.find(c => c.id === reserva.cocheId);
  const card   = dm ? "#111827" : "#FFFFFF";
  const border = dm ? "#2E3A55" : "#E2E8F0";
  const text   = dm ? "#E2E8F0" : "#0F172A";
  const muted  = dm ? "#64748B" : "#94A3B8";

  const esMia        = reserva.usuarioId === usuario?.id;
  const puedeCancelar = puedeCancelarCoche(reserva, usuario);
  const esResponsable = puedeCancelar && !esMia;
  const emp    = EMPRESAS.find(e => e.id === reserva.empresaId);
  const durMin = horaToMin(reserva.horaFin) - horaToMin(reserva.horaInicio);
  const durStr = durMin >= 60 ? `${Math.floor(durMin/60)}h${durMin%60>0?` ${durMin%60}min`:""}` : `${durMin}min`;

  const fechaFmt = new Date(reserva.fecha + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000099", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }} onMouseDown={onClose}>
      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, width: "100%", maxWidth: 420, padding: 28, boxShadow: "0 24px 80px #0009" }} onMouseDown={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: coche.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{coche.icon}</div>
            <div>
              <h3 style={{ margin: 0, color: coche.color, fontSize: 16, fontWeight: 800 }}>{coche.nombre}</h3>
              <p style={{ margin: 0, color: muted, fontSize: 12 }}>Detalles de la reserva</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: muted, fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Fecha */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 14px", background: dm ? "#1A2235" : "#F8FAFC", borderRadius: 8, border: `1px solid ${border}` }}>
            <span style={{ fontSize: 18 }}>📅</span>
            <div>
              <p style={{ margin: 0, color: muted, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Fecha</p>
              <p style={{ margin: 0, color: text, fontSize: 13, fontWeight: 700, textTransform: "capitalize" }}>{fechaFmt}</p>
            </div>
          </div>

          {/* Horario */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 14px", background: coche.color + "11", borderRadius: 8, border: `1px solid ${coche.color}33` }}>
            <span style={{ fontSize: 18 }}>⏰</span>
            <div>
              <p style={{ margin: 0, color: muted, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Horario</p>
              <p style={{ margin: 0, color: coche.color, fontSize: 15, fontWeight: 800 }}>{reserva.horaInicio} – {reserva.horaFin} <span style={{ fontSize: 12, fontWeight: 600 }}>({durStr})</span></p>
            </div>
          </div>

          {/* Reservado por */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 14px", background: dm ? "#1A2235" : "#F8FAFC", borderRadius: 8, border: `1px solid ${border}` }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: (emp?.color || empColor) + "33", border: `1.5px solid ${emp?.color || empColor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: emp?.color || empColor, flexShrink: 0 }}>
              {reserva.usuarioNombre?.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()||"?"}
            </div>
            <div>
              <p style={{ margin: 0, color: muted, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Reservado por</p>
              <p style={{ margin: 0, color: text, fontSize: 13, fontWeight: 700 }}>{reserva.usuarioNombre} {esMia && <span style={{ color: coche.color, fontSize: 11 }}>(tú)</span>}</p>
              {emp && <p style={{ margin: 0, color: emp.color, fontSize: 11 }}>{emp.nombre}</p>}
            </div>
          </div>

          {/* Motivo */}
          {reserva.motivo && (
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 14px", background: dm ? "#1A2235" : "#F8FAFC", borderRadius: 8, border: `1px solid ${border}` }}>
              <span style={{ fontSize: 18 }}>📝</span>
              <div>
                <p style={{ margin: 0, color: muted, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Motivo</p>
                <p style={{ margin: 0, color: text, fontSize: 13 }}>{reserva.motivo}</p>
              </div>
            </div>
          )}

          {/* Aviso de responsable */}
          {esResponsable && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 12px", background: "#F6AD5518", borderRadius: 8, border: "1px solid #F6AD5544" }}>
              <span style={{ fontSize: 14 }}>🔑</span>
              <span style={{ color: "#DD8B1E", fontSize: 11, fontWeight: 600 }}>Eres responsable de este vehículo: puedes cancelar esta reserva.</span>
            </div>
          )}
        </div>

        {/* Botones */}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, fontFamily: "inherit", fontSize: 13, fontWeight: 700, padding: "10px", borderRadius: 8, border: `1px solid ${border}`, cursor: "pointer", background: "transparent", color: muted }}>Cerrar</button>
          {puedeCancelar && (
            <button onClick={onCancelar}
              style={{ flex: 1, fontFamily: "inherit", fontSize: 13, fontWeight: 800, padding: "10px", borderRadius: 8, cursor: "pointer", background: "#E53E3E22", color: "#E53E3E", border: "1px solid #E53E3E44" }}>
              🗑️ Cancelar reserva
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
