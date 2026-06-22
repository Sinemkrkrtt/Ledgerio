import React, { useState, useRef, useEffect } from 'react'; 
import { 
  StyleSheet, Text, View, TouchableOpacity, ScrollView, 
  Platform, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'; 
import { useNavigation } from '@react-navigation/native';
import { useTheme } from './ThemeContext'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../../firebaseConfig';


const CATEGORIZED_QA_DATABASE = {
  tr: [
    {
      id: 'cat1',
      title: 'Uygulama Rehberi',
      icon: 'cellphone-link',
      questions: [
        { id: 'q1', title: 'Ledgerly nedir?', answer: 'Ledgerly, kişisel finansını kolayca yönetmeni sağlayan akıllı bir bütçe asistanıdır. Gelir-gider takibi yapabilir, hedefler belirleyebilir ve paranı nereye harcadığını grafiklerle görebilirsin. 🚀' },
        { id: 'q10', title: 'Verilerim güvende mi?', answer: 'Kesinlikle! Ledgerly verilerini güvenli bir şekilde cihazında veya güvenli sunucularda şifrelenmiş olarak tutar. Finansal gizliliğin bizim için en önemli önceliktir. 🔒' },
        { id: 'q11', title: 'Gelir/gider nasıl eklerim?', answer: 'Ana sayfadaki büyük "+" butonuna tıklayarak anında gelir veya gider ekleyebilirsin. İşlemlerini kategorize etmeyi unutma, böylece analiz ekranında daha net sonuçlar görürsün. 📝' },
        { id: 'q17', title: 'Raporlarımı dışa aktarabilir miyim?', answer: 'Evet, Ledgerly yakında gelecek güncellemelerle finansal verilerini PDF veya Excel (CSV) formatında dışa aktarmana olanak tanıyacak. Takipte kal! 📂' },
        { id: 'q19', title: 'Fatura hatırlatıcısı ekleyebilir miyim?', answer: 'Kesinlikle! Düzenli ödemelerini eklerken "tekrarlayan işlem" olarak işaretleyebilir ve günü geldiğinde sana bildirim ile hatırlatmamızı sağlayabilirsin. 🔔' },
        { id: 'q21', title: 'İşlemleri silebilir miyim?', answer: 'Tabii ki! Geçmiş işlemler listesinde silmek veya düzenlemek istediğin işlemin üzerine tıklayarak ya da sağa kaydırarak bu işlemi gerçekleştirebilirsin. ✏️' },
        { id: 'q25', title: 'Farklı para birimleri var mı?', answer: 'Ledgerly şimdilik ana para birimini destekliyor, ama çoklu para birimi özelliği (Döviz, Kripto) yakında eklenecek! 🌍' },
        { id: 'q26', title: 'Karanlık mod (Dark Mode) var mı?', answer: 'Evet! Cihazının ayarlarına göre otomatik değişir veya uygulamanın Ayarlar sayfasından manuel olarak aktif edebilirsin. 🌙' },
        { id: 'q27', title: 'Ortak bütçe yapabilir miyim?', answer: 'Aile ve çiftler için ortak bütçe özelliği yol haritamızda var! Şimdilik kendi bireysel finansına odaklanabilirsin. 👥' },
        { id: 'q28', title: 'Hesabımı nasıl silerim?', answer: 'Ayarlar menüsünden "Hesabı Sil" seçeneğiyle tüm verilerini kalıcı olarak silebilirsin. Bu işlem geri alınamaz! 🗑️' },
      ]
    },
    {
      id: 'cat2',
      title: 'Bütçe Taktikleri',
      icon: 'chart-pie',
      questions: [
        { id: 'q2', title: 'Nasıl bütçe yapabilirim?', answer: 'Önce aylık net gelirini belirle. Ardından kira, fatura gibi sabit giderlerini çıkar. Kalan parayı isteklerin ve tasarrufların için paylaştır. Her harcamayı kaydetmek bütçeye sadık kalmanın sırrıdır. 📊' },
        { id: 'q3', title: '50/30/20 kuralı nedir?', answer: 'Bu kurala göre gelirinin %50\'sini zorunlu ihtiyaçlara (kira, fatura, market), %30\'unu kişisel isteklere (eğlence, hobiler) ve %20\'sini ise birikim veya borç ödemeye ayırmalısın. 🍕' },
        { id: 'q13', title: 'Sıfır tabanlı bütçe nedir?', answer: 'Gelirini tamamen gider, tasarruf ve yatırımlara paylaştırıp ay sonunda sıfıra ulaşmayı hedefleyen yöntemdir. Bütçendeki her kuruşun spesifik bir amacı olur! 🎯' },
        { id: 'q14', title: 'Düzensiz gelirim var, ne yapmalıyım?', answer: 'Önce en düşük kazandığın ayı baz alarak temel ihtiyaçlarını planla. Fazla kazandığın aylarda artan parayı doğrudan birikim veya acil durum fonuna aktar. 📊' },
        { id: 'q23', title: 'Zarf sistemi nedir?', answer: 'Klasik bir bütçeleme taktiğidir. Aylık bütçeni "Mutfak", "Eğlence", "Fatura" gibi zarflara nakit olarak ayırırsın. Zarf boşaldığında, o ayki harcama hakkın bitmiş demektir. ✉️' },
        { id: 'q29', title: 'Önce Kendine Öde kuralı nedir?', answer: 'Maaşın yattığı an faturaları ödemeden veya harcama yapmadan önce, belirli bir miktarı anında birikim hesabına gönderme taktiğidir. Tasarrufu garantiler! 🏦' },
        { id: 'q30', title: 'Bütçede 80/20 (Pareto) nedir?', answer: 'Harcamalarının %80\'inin, alışkanlıklarının %20\'sinden kaynaklandığını söyler. Bütçeni yoran o %20\'lik gereksiz harcamayı bul ve kes! ✂️' },
        { id: 'q31', title: 'Kakeibo nedir?', answer: 'Japon bütçeleme sanatıdır. Harcamalarını farkındalıkla yapmanı sağlar: "Buna gerçekten ihtiyacım var mı? Alırsam hayatımı nasıl etkiler?" sorularını merkeze alır. 🌸' },
        { id: 'q32', title: '60% Kuralı nedir?', answer: 'Gelirinin %60\'ını zorunlu giderlere ayırıp, kalan %40\'ı eşit şekilde (10-10-10-10) emeklilik, uzun vadeli birikim, kısa vadeli birikim ve eğlenceye ayırmaktır. 🍰' },
      ]
    },
    {
      id: 'cat3',
      title: 'Tasarruf & Harcama',
      icon: 'piggy-bank-outline',
      questions: [
        { id: 'q4', title: 'Nasıl daha fazla tasarruf ederim?', answer: 'Kullanmadığın abonelikleri iptal et, dışarıda yemek yerine evde pişirmeyi dene ve maaşını alır almaz belirli bir miktarı "kendine ödeme" yaparak doğrudan birikim hesabına aktar. 💰' },
        { id: 'q5', title: 'Gereksiz harcamaları nasıl durdururum?', answer: '"24 Saat Kuralı"nı uygula! İstediğin bir şeyi almadan önce tam 24 saat bekle. Çoğu zaman o anki satın alma dürtüsü geçecek ve aslında ona ihtiyacın olmadığını fark edeceksin. ⏳' },
        { id: 'q8', title: 'Mutfak masraflarımı nasıl kısabilirim?', answer: 'Markete gitmeden önce mutlaka liste yap ve aç karnına alışverişe çıkma. Ayrıca toplu alışveriş yapmak ve haftalık yemek planı hazırlamak bütçeni ciddi oranda rahatlatır. 🛒' },
        { id: 'q12', title: 'Duygusal harcamalardan nasıl kaçınırım?', answer: 'Stresli veya çok mutluyken alışveriş uygulamalarından uzak dur. Harcama yapmak yerine yürüyüşe çıkmak, müzik dinlemek veya bir arkadaşınla konuşmak gibi ücretsiz alternatifler bul. 🧘‍♂️' },
        { id: 'q18', title: 'Latte Faktörü nedir?', answer: 'Her gün dışarıda içtiğin kahve gibi küçük, önemsiz görünen düzenli harcamaların uzun vadede devasa bir maliyete dönüşmesidir. Küçük sızıntılar büyük gemileri batırır! ☕' },
        { id: 'q24', title: 'Hedefli birikim (Sinking Fund) nedir?', answer: 'Araç sigortası, tatil veya yeni bir telefon gibi gelecekteki büyük bir harcama için her ay azar azar para ayırdığın özel bir birikim hedefidir. Büyük alımların bütçeni sarsmasını engeller! 🎯' },
        { id: 'q33', title: '30 Gün Kuralı nedir?', answer: 'Pahalı bir ürün almak istediğinde 30 gün beklemektir. Çoğu zaman o heves geçer ve o parayı biriktirdiğinle kalırsın. Sabır en iyi tasarruftur! 📅' },
        { id: 'q34', title: 'İstek ve İhtiyaç farkı nedir?', answer: 'İhtiyaç hayatta kalman ve çalışman için zorunlu olandır (Gıda, kira). İstek ise hayat kaliteni artıran ama olmasa da yaşayabileceğin şeylerdir (Yeni model telefon). ⚖️' },
        { id: 'q35', title: 'Dışarıda yeme masrafını nasıl kısarım?', answer: 'Evde haftalık yemek hazırlığı (meal prep) yap. Cuma akşamlarını dışarıda yeme ödülü olarak belirle, diğer günler evde yemeye özen göster. 🍱' },
        { id: 'q36', title: 'Tatil için nasıl para biriktiririm?', answer: 'Tatil maliyetini hesapla ve bunu 12 aya böl. Her ay bu küçük rakamı "Tatil Fonu"na aktar, yaz geldiğinde tatilin çoktan nakit ödenmiş olur! 🏖️' },
      ]
    },
    {
      id: 'cat4',
      title: 'Borç & Kredi',
      icon: 'credit-card-minus-outline',
      questions: [
        { id: 'q6', title: 'Borçlarımı en hızlı nasıl kapatırım?', answer: '"Kar Topu" veya "Çığ" yöntemini kullanabilirsin. Kar topunda en küçük borçtan başlayarak motivasyon kazanırsın. Çığ yönteminde ise faizi en yüksek olan borca odaklanarak matematiken daha fazla tasarruf edersin. 📉' },
        { id: 'q16', title: 'Kredi notumu nasıl yükseltirim?', answer: 'Kredi kartı ekstrelerini zamanında ve tam ödeyerek, kredi limitinin %30\'undan fazlasını kullanmayarak ve çok sık yeni kredi başvurusu yapmayarak notunu hızlıca yükseltebilirsin. 💳' },
        { id: 'q37', title: 'Asgari tutarı ödemek mantıklı mı?', answer: 'Hayır! Sadece asgari tutarı ödemek devasa faizler biriktirmene neden olur ve seni borç tuzağına çeker. Mümkünse her ay borcun tamamını kapat. ⚠️' },
        { id: 'q38', title: 'İyi borç ve kötü borç nedir?', answer: 'İyi borç, sana ileride para kazandıracak şeyler içindir (Ev kredisi, eğitim). Kötü borç ise değer kaybeden veya tüketim odaklı şeyler için alınır (Tatil kredisi). ⚖️' },
        { id: 'q39', title: 'Taksitli alışveriş yapmalı mıyım?', answer: 'Faizsiz taksit, yüksek enflasyonlu ortamlarda avantajlıdır. Ancak çok fazla taksit birikirse, aylık nakit akışını felç edebilir. Sınırlarını bil! 💳' },
        { id: 'q40', title: 'Borç yapılandırma (Konsolidasyon) nedir?', answer: 'Dağınık ve yüksek faizli birden fazla borcu (kartlar, krediler), tek ve daha düşük faizli yeni bir kredide birleştirip ödemeyi kolaylaştırma işlemidir. 🔄' },
      ]
    },
    {
      id: 'cat5',
      title: 'Yatırım & Ekonomi',
      icon: 'finance',
      questions: [
        { id: 'q7', title: 'Acil durum fonu ne kadar olmalı?', answer: 'İdeal bir acil durum fonu, işsiz kalma veya beklenmedik masraflara karşı 3 ile 6 aylık zorunlu yaşam masraflarını (kira, gıda, faturalar) karşılayacak büyüklükte olmalıdır. 🛡️' },
        { id: 'q9', title: 'Bileşik faiz nedir?', answer: 'Bileşik faiz, sadece ana paranın değil, kazandığın faizin de faiz getirmesidir. Albert Einstein\'ın dediği gibi "Dünyanın 8. harikasıdır". Erken yaşta yatırıma başlamak bu yüzden çok önemlidir! 📈' },
        { id: 'q15', title: '72 Kuralı nedir?', answer: 'Yatırımının ne kadar sürede ikiye katlanacağını hesaplamanın kısa yoludur. 72 sayısını yıllık faiz veya getiri oranına bölersen, tahmini yılı bulursun. ⏱️' },
        { id: 'q20', title: 'Varlık ve Yükümlülük farkı nedir?', answer: 'Basitçe; varlık cebine para koyan şeylerdir (yatırımlar, kira geliri), yükümlülük ise cebinden para çıkaran şeylerdir (krediler, borçlar). Zenginlik varlıkları artırmakla başlar! ⚖️' },
        { id: 'q22', title: 'Enflasyon paramı nasıl etkiler?', answer: 'Enflasyon paranın alım gücünü düşürür. Geçen yıl 100 TL\'ye aldığın bir şey bu yıl 120 TL ise paran değer kaybetmiş demektir. Bu yüzden parayı sadece biriktirmek değil, yatırıma dönüştürmek gerekir. 📉' },
        { id: 'q41', title: 'Yatırıma ne zaman başlamalıyım?', answer: 'En iyi zaman dün, ikinci en iyi zaman bugün! Bileşik faiz sayesinde ne kadar erken başlarsan, ileride o kadar az parayla daha çok kazanırsın. 🚀' },
        { id: 'q42', title: 'Portföy çeşitlendirmesi nedir?', answer: 'Tüm yumurtaları aynı sepete koymamaktır. Riskini düşürmek için paranı hisse senedi, değerli madenler ve fonlar gibi farklı araçlara bölmelisin. 🥚' },
        { id: 'q43', title: 'Ayı ve Boğa piyasası nedir?', answer: 'Boğa (Bull) piyasası fiyatların yükseldiği iyimser dönemdir. Ayı (Bear) piyasası ise fiyatların düştüğü ve karamsarlığın hakim olduğu dönemdir. 🐂🐻' },
        { id: 'q44', title: 'Pasif gelir nedir?', answer: 'Sen uyurken bile sana para kazandıran gelirlerdir. Temettü ödemeleri, fon getirileri veya kira geliri buna örnektir. Finansal özgürlüğün anahtarıdır! 💸' },
      ]
    }
  ],
  en: [
    {
      id: 'cat1',
      title: 'App Guide',
      icon: 'cellphone-link',
      questions: [
        { id: 'q1', title: 'What is Ledgerly?', answer: 'Ledgerly is a smart budget assistant that helps you easily manage your personal finances. You can track income/expenses, set goals, and see where you spend your money with charts. 🚀' },
        { id: 'q10', title: 'Is my data safe?', answer: 'Absolutely! Ledgerly safely stores your data encrypted on your device or secure servers. Your financial privacy is our top priority. 🔒' },
        { id: 'q11', title: 'How do I add income/expense?', answer: 'You can instantly add income or expenses by tapping the big "+" button on the home page. Don\'t forget to categorize your transactions to see clearer results on the analysis screen. 📝' },
        { id: 'q17', title: 'Can I export my reports?', answer: 'Yes, Ledgerly will allow you to export your financial data in PDF or Excel (CSV) format with upcoming updates. Stay tuned! 📂' },
        { id: 'q19', title: 'Can I add a bill reminder?', answer: 'Definitely! When adding regular payments, you can mark them as a "recurring transaction" and let us remind you with a notification when the day comes. 🔔' },
        { id: 'q21', title: 'Can I delete transactions?', answer: 'Of course! You can delete or edit a transaction by tapping on it or swiping right in the past transactions list. ✏️' },
        { id: 'q25', title: 'Are there different currencies?', answer: 'Ledgerly currently supports the main currency, but multi-currency feature (FX, Crypto) will be added soon! 🌍' },
        { id: 'q26', title: 'Is there a Dark Mode?', answer: 'Yes! It changes automatically according to your device settings, or you can activate it manually from the app\'s Settings page. 🌙' },
        { id: 'q27', title: 'Can I make a joint budget?', answer: 'A joint budget feature for families and couples is on our roadmap! For now, you can focus on your individual finances. 👥' },
        { id: 'q28', title: 'How do I delete my account?', answer: 'You can permanently delete all your data using the "Delete Account" option in the Settings menu. This action cannot be undone! 🗑️' },
      ]
    },
    {
      id: 'cat2',
      title: 'Budgeting Tactics',
      icon: 'chart-pie',
      questions: [
        { id: 'q2', title: 'How can I make a budget?', answer: 'First, determine your monthly net income. Then subtract your fixed expenses like rent and bills. Allocate the remaining money for your wants and savings. Recording every expense is the secret to sticking to a budget. 📊' },
        { id: 'q3', title: 'What is the 50/30/20 rule?', answer: 'According to this rule, you should allocate 50% of your income to needs (rent, bills, groceries), 30% to personal wants (entertainment, hobbies), and 20% to savings or debt repayment. 🍕' },
        { id: 'q13', title: 'What is a zero-based budget?', answer: 'It is a method where you allocate your income entirely to expenses, savings, and investments, aiming to reach zero at the end of the month. Every penny in your budget has a specific purpose! 🎯' },
        { id: 'q14', title: 'I have an irregular income, what should I do?', answer: 'First, plan your basic needs based on your lowest earning month. In months you earn more, transfer the excess money directly to savings or an emergency fund. 📊' },
        { id: 'q23', title: 'What is the envelope system?', answer: 'It is a classic budgeting tactic. You divide your monthly budget in cash into envelopes like "Groceries", "Entertainment", "Bills". When the envelope is empty, your spending limit for that month is over. ✉️' },
        { id: 'q29', title: 'What is the Pay Yourself First rule?', answer: 'It is the tactic of sending a certain amount directly to your savings account the moment your salary is deposited, before paying bills or spending. It guarantees saving! 🏦' },
        { id: 'q30', title: 'What is 80/20 (Pareto) in budgeting?', answer: 'It says that 80% of your expenses come from 20% of your habits. Find that 20% unnecessary spending that drains your budget and cut it! ✂️' },
        { id: 'q31', title: 'What is Kakeibo?', answer: 'It is the Japanese art of budgeting. It helps you spend mindfully, centering around the questions: "Do I really need this? How will it affect my life if I buy it?" 🌸' },
        { id: 'q32', title: 'What is the 60% Rule?', answer: 'It means allocating 60% of your income to mandatory expenses, and dividing the remaining 40% equally (10-10-10-10) into retirement, long-term savings, short-term savings, and entertainment. 🍰' },
      ]
    },
    {
      id: 'cat3',
      title: 'Saving & Spending',
      icon: 'piggy-bank-outline',
      questions: [
        { id: 'q4', title: 'How do I save more?', answer: 'Cancel subscriptions you don\'t use, try cooking at home instead of eating out, and "pay yourself" a certain amount by transferring it directly to your savings account as soon as you get your salary. 💰' },
        { id: 'q5', title: 'How do I stop unnecessary spending?', answer: 'Apply the "24-Hour Rule"! Wait exactly 24 hours before buying something you want. Most of the time, the urge to buy will pass, and you will realize you don\'t actually need it. ⏳' },
        { id: 'q8', title: 'How can I cut my grocery costs?', answer: 'Always make a list before going to the supermarket and never shop on an empty stomach. Also, buying in bulk and meal planning for the week will significantly relieve your budget. 🛒' },
        { id: 'q12', title: 'How do I avoid emotional spending?', answer: 'Stay away from shopping apps when stressed or overly happy. Find free alternatives like taking a walk, listening to music, or talking to a friend instead of spending. 🧘‍♂️' },
        { id: 'q18', title: 'What is the Latte Factor?', answer: 'It is how small, seemingly insignificant regular expenses, like the coffee you buy every day, turn into a massive cost in the long run. Small leaks sink great ships! ☕' },
        { id: 'q24', title: 'What is a Sinking Fund?', answer: 'It is a specific savings goal where you set aside a little money each month for a large future expense, like car insurance, a vacation, or a new phone. It prevents big purchases from shaking your budget! 🎯' },
        { id: 'q33', title: 'What is the 30-Day Rule?', answer: 'It means waiting 30 days when you want to buy an expensive item. Most of the time, the desire fades away, and you get to keep the money you saved. Patience is the best saving! 📅' },
        { id: 'q34', title: 'What is the difference between Needs and Wants?', answer: 'A need is essential for your survival and functioning (Food, rent). A want is something that improves your quality of life but you can live without (A newer model phone). ⚖️' },
        { id: 'q35', title: 'How do I reduce dining out expenses?', answer: 'Do a weekly meal prep at home. Designate Friday nights as a reward for eating out, and try to eat at home on other days. 🍱' },
        { id: 'q36', title: 'How do I save money for a vacation?', answer: 'Calculate the vacation cost and divide it by 12 months. Transfer this small amount to a "Vacation Fund" every month. When summer comes, your vacation is already paid in cash! 🏖️' },
      ]
    },
    {
      id: 'cat4',
      title: 'Debt & Credit',
      icon: 'credit-card-minus-outline',
      questions: [
        { id: 'q6', title: 'How do I clear my debts fastest?', answer: 'You can use the "Snowball" or "Avalanche" method. In the snowball, you gain motivation by starting with the smallest debt. In the avalanche, you save mathematically more by focusing on the debt with the highest interest. 📉' },
        { id: 'q16', title: 'How do I raise my credit score?', answer: 'You can quickly raise your score by paying your credit card statements fully and on time, not using more than 30% of your credit limit, and not applying for new credit too often. 💳' },
        { id: 'q37', title: 'Is it logical to pay the minimum amount?', answer: 'No! Paying only the minimum amount causes you to accumulate massive interest and pulls you into a debt trap. If possible, pay off the full balance every month. ⚠️' },
        { id: 'q38', title: 'What are good debt and bad debt?', answer: 'Good debt is for things that will make you money in the future (Mortgage, education). Bad debt is for things that depreciate or are consumption-oriented (Vacation loan). ⚖️' },
        { id: 'q39', title: 'Should I buy in installments?', answer: 'Interest-free installments are advantageous in high-inflation environments. However, if too many installments pile up, it can paralyze your monthly cash flow. Know your limits! 💳' },
        { id: 'q40', title: 'What is debt consolidation?', answer: 'It is the process of combining multiple scattered and high-interest debts (cards, loans) into a new, single loan with a lower interest rate to make payments easier. 🔄' },
      ]
    },
    {
      id: 'cat5',
      title: 'Investment & Economy',
      icon: 'finance',
      questions: [
        { id: 'q7', title: 'How much should an emergency fund be?', answer: 'An ideal emergency fund should be large enough to cover 3 to 6 months of mandatory living expenses (rent, food, bills) against job loss or unexpected costs. 🛡️' },
        { id: 'q9', title: 'What is compound interest?', answer: 'Compound interest is earning interest not only on the principal amount but also on the interest you\'ve already earned. As Albert Einstein said, it\'s the "8th wonder of the world". That\'s why starting to invest early is crucial! 📈' },
        { id: 'q15', title: 'What is the Rule of 72?', answer: 'It is a quick way to calculate how long it will take for your investment to double. If you divide the number 72 by your annual interest or return rate, you find the estimated years. ⏱️' },
        { id: 'q20', title: 'What is the difference between an Asset and a Liability?', answer: 'Simply put, an asset puts money in your pocket (investments, rental income), while a liability takes money out of your pocket (loans, debts). Wealth starts with increasing assets! ⚖️' },
        { id: 'q22', title: 'How does inflation affect my money?', answer: 'Inflation decreases the purchasing power of your money. If something you bought for $100 last year is $120 this year, your money has lost value. Therefore, money should not just be saved but turned into investments. 📉' },
        { id: 'q41', title: 'When should I start investing?', answer: 'The best time was yesterday, the second-best time is today! Thanks to compound interest, the earlier you start, the more you earn with less money in the future. 🚀' },
        { id: 'q42', title: 'What is portfolio diversification?', answer: 'It means not putting all your eggs in one basket. To reduce your risk, you should divide your money into different instruments like stocks, precious metals, and funds. 🥚' },
        { id: 'q43', title: 'What are Bear and Bull markets?', answer: 'A Bull market is an optimistic period where prices are rising. A Bear market is a period where prices are falling and pessimism prevails. 🐂🐻' },
        { id: 'q44', title: 'What is passive income?', answer: 'It is income that earns you money even while you sleep. Dividend payments, fund returns, or rental income are examples of this. It is the key to financial freedom! 💸' },
      ]
    }
  ]
};

const AIChat = () => {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme(); 
  const scrollViewRef = useRef();

  const themeNavy = isDarkMode ? '#09F8F0' : '#040E68';
  const themeBackground = isDarkMode ? '#0F172A' : '#F8FAFC';
  const themeText = isDarkMode ? '#F8FAFC' : '#1E293B';
  const themeSubText = isDarkMode ? '#94A3B8' : '#64748B';

  const [language, setLanguage] = useState('tr'); 
  const [isTyping, setIsTyping] = useState(false);
  const [chatHistory, setChatHistory] = useState([]); 
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  // 🌟 Misafir uyarı metinleri eklendi
  const tGuest = {
    title: language === 'tr' ? 'Hesap Gerekli' : 'Account Required',
    msg: language === 'tr' ? 'AI asistanla konuşmak ve kişiselleştirilmiş bütçe tavsiyeleri almak için lütfen hesap oluşturun veya giriş yapın.' : 'Please create an account or log in to talk to the AI assistant and get personalized budgeting advice.',
    cancel: language === 'tr' ? 'Vazgeç' : 'Cancel',
    register: language === 'tr' ? 'Kayıt Ol' : 'Sign Up',
    login: language === 'tr' ? 'Giriş Yap' : 'Log In',
  };

  useEffect(() => {
    const initChat = async () => {
      const savedLang = await AsyncStorage.getItem('appLanguage') || 'tr';
      setLanguage(savedLang);

      const initialMessage = savedLang === 'tr' 
        ? "Merhaba! Ben Ledgerly Finansal Asistanın. Bütçe, tasarruf veya uygulama ile ilgili konularda aşağıdan bir kategori seçerek hızlıca cevap alabilirsin. Nasıl yardımcı olabilirim? 🚀"
        : "Hello! I am your Ledgerly Financial Assistant. You can quickly get answers about budgeting, saving, or the app by selecting a category below. How can I help? 🚀";

      setChatHistory([{ id: '1', text: initialMessage, isUser: false }]);
    };
    initChat();
  }, []);

  const handleAskQuestion = (questionObj) => {
    // 🌟 GÜVENLİK KAPISI: MİSAFİR KONTROLÜ
    if (!auth.currentUser) {
        Alert.alert(
            tGuest.title,
            tGuest.msg,
            [
                { text: tGuest.cancel, style: 'cancel' },
                { text: tGuest.register, onPress: () => navigation.navigate('Register') },
                { text: tGuest.login, onPress: () => navigation.navigate('Login') }
            ],
            // iOS için uygulamanın temasına göre siyah/beyaz alert stili
            { userInterfaceStyle: isDarkMode ? 'dark' : 'light' }
        );
        return;
    }

    const userMsg = { id: Date.now().toString(), text: questionObj.title, isUser: true };
    setChatHistory(prev => [...prev, userMsg]);
    
    setIsTyping(true);

    setTimeout(() => {
      const aiMsg = { id: (Date.now() + 1).toString(), text: questionObj.answer, isUser: false };
      setChatHistory(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1000); 
  };

  useEffect(() => {
    if (scrollViewRef.current) {
        setTimeout(() => {
            scrollViewRef.current.scrollToEnd({ animated: true });
        }, 100);
    }
  }, [chatHistory, isTyping]);

  const currentCategories = CATEGORIZED_QA_DATABASE[language] || CATEGORIZED_QA_DATABASE['tr'];
  const activeCategory = currentCategories.find(c => c.id === selectedCategoryId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeBackground }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: isDarkMode ? '#1E293B' : '#E2E8F0', backgroundColor: isDarkMode ? '#0F172A' : '#FFFFFF' }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{padding: 5}}>
                <Ionicons name="arrow-back" size={24} color={themeText} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
                <MaterialCommunityIcons name="robot" size={22} color={themeNavy} style={{marginRight: 6}}/>
                <View>
                    <Text style={[styles.headerTitle, { color: themeText }]}>
                        {language === 'tr' ? 'Asistan' : 'Advisor'}
                    </Text>
                    <Text style={[styles.statusText, { color: '#10B981' }]}>
                        ● {language === 'tr' ? 'Çevrimiçi' : 'Online'}
                    </Text>
                </View>
            </View>
            <View style={{width: 24}} /> 
        </View>

        {/* Mesaj Alanı */}
        <ScrollView 
            ref={scrollViewRef}
            style={styles.chatArea} 
            contentContainerStyle={{padding: 15, paddingBottom: 20}}
            showsVerticalScrollIndicator={false}
        >
            {chatHistory.map(msg => (
                <View key={msg.id} style={[styles.messageBubbleWrapper, msg.isUser ? styles.msgRight : styles.msgLeft]}>
                    {!msg.isUser && (
                        <View style={[styles.aiAvatar, { backgroundColor: themeNavy }]}>
                            <MaterialCommunityIcons name="robot-outline" size={16} color="#FFF" />
                        </View>
                    )}
                    <View style={[
                        styles.messageBubble, 
                        msg.isUser 
                            ? { backgroundColor: themeNavy, borderTopRightRadius: 4 } 
                            : { backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF', borderTopLeftRadius: 4, ...styles.shadowProps }
                    ]}>
                        <Text style={[styles.messageText, msg.isUser ? { color: '#FFF' } : { color: themeText }]}>{msg.text}</Text>
                    </View>
                </View>
            ))}
            
            {isTyping && (
                <View style={[styles.messageBubbleWrapper, styles.msgLeft]}>
                    <View style={[styles.aiAvatar, { backgroundColor: themeNavy }]}>
                        <MaterialCommunityIcons name="robot-outline" size={16} color="#FFF" />
                    </View>
                    <View style={[styles.messageBubble, { backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF', borderTopLeftRadius: 4, paddingVertical: 12, ...styles.shadowProps}]}>
                        <Text style={{color: themeSubText, fontStyle: 'italic', fontSize: 12}}>
                            {language === 'tr' ? 'Yazıyor...' : 'Typing...'}
                        </Text>
                    </View>
                </View>
            )}
        </ScrollView>

        {/* 🚀 MODERN KATEGORİ VE SORU SEÇİM ALANI */}
        <View style={[styles.optionsArea, { backgroundColor: isDarkMode ? '#0B1120' : '#FFFFFF', borderTopColor: isDarkMode ? '#1E293B' : '#E2E8F0' }]}>
            
            <View style={styles.optionsHeader}>
                {selectedCategoryId && (
                    <TouchableOpacity 
                        style={styles.backArrowButton}
                        onPress={() => setSelectedCategoryId(null)}
                        disabled={isTyping}
                    >
                        <Ionicons name="chevron-back" size={26} color={themeText} />
                    </TouchableOpacity>
                )}
                <View style={{flex: 1, marginLeft: selectedCategoryId ? 8 : 0}}>
                    <Text style={[styles.optionsTitle, { color: themeText }]}>
                        {!selectedCategoryId 
                            ? (language === 'tr' ? 'Ne hakkında konuşalım?' : 'What should we talk about?') 
                            : activeCategory?.title}
                    </Text>
                    <Text style={[styles.optionsSubtitle, { color: themeSubText }]}>
                        {!selectedCategoryId 
                            ? (language === 'tr' ? 'Aşağıdan bir kategori seçin' : 'Select a category below') 
                            : (language === 'tr' ? 'Sormak istediğiniz soruyu seçin' : 'Select a question to ask')}
                    </Text>
                </View>
            </View>
            
            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.optionsScroll}
            >
                {/* 🚀 KATEGORİLER (Zarif Premium Liste) */}
                {!selectedCategoryId && (
                    <View style={styles.categoriesList}>
                        {currentCategories.map((category) => (
                            <TouchableOpacity 
                                key={category.id}
                                disabled={isTyping}
                                style={[
                                    styles.categoryListItem, 
                                    { 
                                        backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF', 
                                        borderColor: isDarkMode ? '#334155' : '#F1F5F9', // Zarif Çerçeve
                                        opacity: isTyping ? 0.5 : 1 
                                    },
                                    !isDarkMode && styles.shadowProps
                                ]}
                                onPress={() => setSelectedCategoryId(category.id)}
                            >
                                <View style={styles.categoryLeft}>
                                    <View style={[styles.iconWrapper, { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC' }]}>
                                        <MaterialCommunityIcons name={category.icon} size={24} color={themeNavy} />
                                    </View>
                                    <Text style={[styles.categoryTitle, { color: themeText }]}>{category.title}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#475569' : '#CBD5E1'} />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* 🚀 SORULAR (Zarif liste elemanları) */}
                {selectedCategoryId && activeCategory && (
                    <View style={styles.questionsListContainer}>
                        {activeCategory.questions.map((q, index) => {
                            const isLastItem = index === activeCategory.questions.length - 1;
                            return (
                                <TouchableOpacity 
                                    key={q.id}
                                    disabled={isTyping}
                                    style={[
                                        styles.questionListItem, 
                                        { borderBottomColor: isDarkMode ? '#334155' : '#F1F5F9' },
                                        isLastItem && { borderBottomWidth: 0 },
                                        { opacity: isTyping ? 0.5 : 1 }
                                    ]}
                                    onPress={() => handleAskQuestion(q)}
                                >
                                    <View style={styles.questionTextContainer}>
                                        <View style={[styles.questionDot, { backgroundColor: themeNavy }]} />
                                        <Text style={[styles.questionTextUI, { color: themeText }]}>{q.title}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color={themeSubText} />
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 15, borderBottomWidth: 1, zIndex: 10 },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontWeight: '700', fontSize: 16 },
  statusText: { fontWeight: '500', fontSize: 11, marginTop: -2 },
  chatArea: { flex: 1 },
  messageBubbleWrapper: { flexDirection: 'row', marginBottom: 15, maxWidth: '85%' },
  msgRight: { alignSelf: 'flex-end' },
  msgLeft: { alignSelf: 'flex-start' },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 8, alignSelf: 'flex-end' },
  messageBubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18 },
  messageText: { fontWeight: '500', fontSize: 13, lineHeight: 20 },
  
  shadowProps: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
  },

  optionsArea: { 
      paddingTop: 20, 
      borderTopWidth: 1, 
      maxHeight: '48%',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
  },
  optionsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 16,
  },
  backArrowButton: {
      paddingVertical: 5,
      paddingRight: 5,
      justifyContent: 'center',
      alignItems: 'center',
  },
  optionsTitle: { 
      fontWeight: '700', 
      fontSize: 16, 
  },
  optionsSubtitle: {
      fontWeight: '400',
      fontSize: 12,
      marginTop: 2,
  },
  optionsScroll: { 
      paddingHorizontal: 20, 
      paddingBottom: 25 
  },
  
  // 🚀 CİLALANMIŞ KATEGORİ LİSTESİ TASARIMI
  categoriesList: {
      flexDirection: 'column',
  },
  categoryListItem: {
      width: '100%', 
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 20,         
      padding: 5,              
      marginBottom: 10,
      borderWidth: 1,           
  },
  categoryLeft: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  iconWrapper: {
      width: 48,
      height: 48,
      borderRadius: 24,         
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
  },
  categoryTitle: {
      fontWeight: '600',
      fontSize: 16,             
      letterSpacing: 0.3,       
  },

  questionsListContainer: {
      marginTop: 4,
  },
  questionListItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
  },
  questionTextContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      paddingRight: 15,
  },
  questionDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: 12,
  },
  questionTextUI: {
      fontWeight: '500',
      fontSize: 14,
      lineHeight: 20,
  }
});

export default AIChat;