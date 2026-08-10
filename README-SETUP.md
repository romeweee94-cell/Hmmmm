# วิธีติดตั้ง (ทำครั้งเดียว)

## 1) กรอก Firebase config
เปิดไฟล์ `firebase-config.js` แทนค่า `YOUR_...` ทั้งหมดด้วยค่าจริงจาก
Firebase Console > ⚙️ Project settings > General > Your apps > SDK setup and configuration

## 2) เปิดใช้งาน Firestore
Firebase Console > Build > Firestore Database > Create database (โหมด production ก็ได้ เดี๋ยวตั้ง Rules เอง)

## 3) เปิดใช้งาน Storage
Firebase Console > Build > Storage > Get started

## 4) ตั้ง Firestore Rules
Firestore Database > Rules > วางโค้ดนี้แทนของเดิม > Publish

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /images/{imageId} {
      allow read: if true;
      allow write: if true;
    }
    match /votes/{username} {
      allow read: if true;
      allow write: if true;
    }
    match /users/{username} {
      allow read, create: if true;
      allow update, delete: if false;
    }
    match /settings/{doc} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

## 5) ตั้ง Storage Rules
Storage > Rules > วางโค้ดนี้แทนของเดิม > Publish

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /images/{allPaths=**} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

> ⚠️ Rules ชุดนี้เปิดให้ทุกคนอ่าน/เขียนได้ตรง ๆ (ไม่มีการล็อกอินระดับ Firebase)
> เหมาะกับงานอีเวนต์ในกลุ่มที่ไว้ใจกัน ถ้าอยากปลอดภัยขึ้นค่อยเพิ่ม
> Firebase Authentication ทีหลังได้

## 6) อัปโหลดขึ้น GitHub แล้วเปิด GitHub Pages
1. Push ไฟล์ทั้งหมด (`index.html`, `style.css`, `app.js`, `firebase-config.js`) ขึ้น repo
2. Settings > Pages > Source เลือก branch `main` โฟลเดอร์ `/root` > Save
3. รอ 1-2 นาที เข้าลิงก์ `https://username.github.io/repo-name/`

เท่านี้ทุกคนที่เข้าเว็บจะเห็นรูปภาพ ผลโหวต และสถานะเปิด/ปิดโหวตชุดเดียวกัน
แบบเรียลไทม์ (ไม่ต้องกดรีเฟรช)
