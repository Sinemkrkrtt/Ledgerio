
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

/**
 * Vadesi gelmiş ama bu ay henüz işlenmemiş sabit giderleri:
 *  1) transactions koleksiyonuna gider olarak ekler (History'de görünür)
 *  2) users/{uid}.totalBalance bakiyesinden düşer
 *  3) recurring_expenses dökümanına last_paid_month yazar (aynı ay tekrar etmemesi için)
 *
 * @param {string} userId — Firebase Auth uid
 * @returns {Promise<{processed: number, totalDeducted: number}>}
 */
export async function processRecurringPayments(userId) {
  if (!userId) return { processed: 0, totalDeducted: 0 };

  const now = new Date();
  const today = now.getDate();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  let processed = 0;
  let totalDeducted = 0;

  try {
    const q = query(collection(db, 'recurring_expenses'), where('userId', '==', userId));
    const snap = await getDocs(q);

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const paymentDay = parseInt(data.payment_day) || 1;
      const amount = parseFloat(data.amount) || 0;
      if (amount <= 0) continue;

      // Eğer payment_day o ayda yoksa (örn. 31, şubatta yok) → son güne çek
      const effectiveDay = Math.min(paymentDay, lastDayOfMonth);

      // Bu ay zaten işlendiyse atla
      if (data.last_paid_month === currentMonthKey) continue;

      // Vadesi henüz gelmediyse atla
      if (today < effectiveDay) continue;

      // 1) İşlem (gider) ekle
      await addDoc(collection(db, 'transactions'), {
        userId,
        name: data.name || 'Sabit Gider',
        category: data.category || 'Diğer',
        amount,
        type: 'gider',
        date: now,
        notes: 'Otomatik Sabit Ödeme',
        isRecurring: true,
        createdAt: serverTimestamp(),
      });

      // 2) Kullanıcı bakiyesini azalt (atomic)
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await updateDoc(userRef, { totalBalance: increment(-amount) });
      } else {
        await setDoc(userRef, { totalBalance: -amount }, { merge: true });
      }

      // 3) last_paid_month güncelle
      await updateDoc(doc(db, 'recurring_expenses', docSnap.id), {
        last_paid_month: currentMonthKey,
        last_paid_at: serverTimestamp(),
      });

      processed += 1;
      totalDeducted += amount;
      console.log(`✓ Sabit gider işlendi: ${data.name} — ₺${amount}`);
    }
  } catch (err) {
    console.error('Sabit gider işleme hatası:', err);
  }

  return { processed, totalDeducted };
}
