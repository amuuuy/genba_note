# GenBa Note リリース手作業ガイド

> 作成日: 2026-03-06
> 対象: Yuma が手動で実施する残タスク
> 参照: UNIMPLEMENTED.md（マスター管理）

---

## 進捗サマリー

| Milestone | 完了 | 残り | 状態 |
|-----------|------|------|------|
| M-01/07 コード修正 | 3/3 | 0 | **完了** |
| M-02/07 外部サービス | 1/7 + 1部分完了 | 5 | 進行中 |
| M-03/07 ドメイン&法務 | 0/4 + 3件部分/要確認 | 1〜4 | 要確認 |
| M-04/07 ストア申請準備 | 0/13 | 13 | 未着手（ドラフト2件あり） |
| M-05/07 ブランチ保護 | 0/1 | 1 | 未着手 |
| M-06/07 最終検証 | 0/6 | 6 | ブロック中（M-02-04/07・M-04/07・M-05/07 完了待ち） |
| M-07/07 ストア提出 | 0/3 | 3 | ブロック中（M-06完了待ち） |

---

## フェーズ構成と実行順序

```
Phase 1（並行可能・即着手OK）── 前提条件なし
  ├── A: Google Play Developer登録 (M-02-02/07)
  ├── B: ドメイン&ホスティング&法務デプロイ (M-03-01/04〜M-03-03/04)
  ├── C: API Key確認 (M-02-05/07〜M-02-07/07)
  ├── D: ブランチ保護 (M-05-01/01)
  └── E: サブスク価格決定 (M-04-01/13) ※価格の意思決定のみ

Phase 2a（Phase 1のB完了後）── M-03/07 ゲート
  └── F: URL公開確認 (M-03-04/04) ← M-03/07の最終確認

Phase 2b（A-2(M-02-03/07) + F(M-03-04/04) 完了後）── M-04/07 着手可能
  ├── G: アプリアイコン作成 (M-04-08/13)
  ├── H: ストア商品作成 (M-04-02/13〜M-04-04/13) ← E（価格決定）も必要
  └── I: ストア設定&メタデータ (M-04-05/13〜M-04-13/13)

Phase 3（H-3(M-04-04/13) 完了後）
  └── J: RevenueCat EAS Secrets (M-02-04/07) ← H-3(M-04-04/13) 必要

Phase 4（全Phase完了後）
  ├── K: 本番ビルド&テスト (M-06/07)
  └── L: ストア提出 (M-07/07) ← M-06完了後
```

> **依存関係の根拠**: UNIMPLEMENTED.md の依存関係表より、M-04/07 は M-02-01/07〜M-02-03/07 + M-03/07 完了が前提。M-02-01/07 は完了済み、M-02-03/07 は部分完了（iOS完了/Android待ち）のため、残る前提は M-02-02/07（Google Play登録→JSONファイル配置でM-02-03/07完了）と M-03/07（ドメイン&法務、M-03-04/04 URL確認まで）。

---

## Phase 1: 並行作業（即着手可能）

### A. Google Play Developer 登録 [M-02-02/07]

- [ ] **手順**:
  1. https://play.google.com/console にアクセス
  2. デベロッパーアカウント作成（$25 一回払い）
  3. アプリ「GenBa Note」を作成
  4. Google Play Console > 設定 > API アクセス > サービスアカウント作成
  5. サービスアカウント JSON ファイルをダウンロード
  6. `genba-note/google-service-account.json` として配置（eas.json の `serviceAccountKeyPath` が参照）
- [ ] **完了確認**: Google Play Console でアプリが作成済み + JSON ファイルが `genba-note/google-service-account.json` に存在
- **注意**: JSONファイルは `.gitignore` に追加されていることを確認（シークレット）

### A-2. EAS Submit 設定完了確認 [M-02-03/07]

> iOS 側は完了済み。A（M-02-02/07）完了後に Android 側を確認する。

- [ ] **手順**:
  1. `genba-note/google-service-account.json` が配置されていることを確認
  2. `eas.json` の設定を検証:
     ```bash
     # iOS: 3項目が全て非空文字列であること（exit 0 = OK）
     jq -e '.submit.production.ios | (.appleId | type=="string" and length>0) and (.ascAppId | type=="string" and length>0) and (.appleTeamId | type=="string" and length>0)' genba-note/eas.json
     # Android: JSONファイルが存在すること
     ls genba-note/google-service-account.json
     ```
     iOS: `true`（exit 0）、Android: ファイル存在 → 両方 OK
- [ ] **完了確認**: 上記コマンドが期待通りの結果

---

### B. ドメイン&ホスティング&法務デプロイ [M-03-01/04, M-03-02/04, M-03-03/04]

> docs/ に CNAME(`genba-note.app`)、privacy/index.html、terms/index.html が既に存在。GitHub Pages でのデプロイ状態を確認する。

- [ ] **B-1. ドメイン確認 (M-03-01/04)**:
  ```bash
  dig genba-note.app
  ```
  DNS レコードが返れば OK。返らなければドメイン取得 or DNS設定が必要。

- [ ] **B-2. ホスティング確認 (M-03-02/04)**:
  ```bash
  curl -sI https://genba-note.app | head -3
  ```
  HTTP 200 または 301 が返れば OK。

  **GitHub Pages の場合の設定手順（未設定の場合）**:
  1. GitHub リポジトリ Settings > Pages
  2. Source: Deploy from a branch > `main` / `/docs`
  3. Custom domain: `genba-note.app`
  4. Enforce HTTPS にチェック
  5. ドメインレジストラで DNS 設定:
     - A レコード: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
     - または CNAME: `<username>.github.io`

- [ ] **B-3. 法務HTML デプロイ確認 (M-03-03/04)**:
  HTML ファイルは作成済み（`docs/privacy/index.html`, `docs/terms/index.html`）。
  B-2 完了後、以下の必須事項が記載されていることを目視確認:

  **プライバシーポリシー必須事項**:
  - [ ] ローカルデータ保存（AsyncStorage, SecureStore）の説明
  - [ ] 外部送信データの開示: RevenueCat, Gemini API, Rakuten API, Sentry, Supabase Auth
  - [ ] サーバーにユーザーアカウント・個人データは保存しない旨
  - [ ] 個人情報保護法（日本）への準拠

  **利用規約必須事項**:
  - [ ] 自動更新サブスクリプション条項（Apple/Google 必須要件）
  - [ ] 解約方法の説明
  - [ ] 見積書・請求書の金額精度に関する免責

- [ ] **完了確認**: 必須事項全チェック済み + デプロイ後にページ単位で確認（`/terms` と `/privacy` の HTTP 200 は Phase 2a の F で確認）

---

### C. API Key 確認 [M-02-05/07, M-02-06/07, M-02-07/07]

3つとも独立して確認可能。

#### C-1. Rakuten API [M-02-05/07]

- [ ] **手順**:
  ```bash
  supabase secrets list
  ```
  `RAKUTEN_APP_ID` が表示されれば OK。
  未登録の場合:
  1. https://webservice.rakuten.co.jp/ でアプリ登録
  2. `supabase secrets set RAKUTEN_APP_ID=<取得したID>`
- [ ] **完了確認**: `supabase secrets list` に `RAKUTEN_APP_ID` が表示 + 本番環境で楽天検索が結果を返す

#### C-2. Gemini API [M-02-06/07]

- [ ] **手順**:
  ```bash
  supabase secrets list
  ```
  `GEMINI_API_KEY` が表示されれば OK。
  未登録の場合:
  1. https://aistudio.google.com/ で API キー取得
  2. `supabase secrets set GEMINI_API_KEY=<取得したキー>`
- [ ] **完了確認**: `supabase secrets list` に `GEMINI_API_KEY` が表示 + 本番環境で AI 資材検索が結果を返す

#### C-3. Sentry DSN [M-02-07/07]

- [ ] **手順**:
  1. https://sentry.io/ でプロジェクト作成（React Native）
  2. DSN を取得
  3. `eas secret:create --name EXPO_PUBLIC_SENTRY_DSN --value <DSN>`
  4. テストクラッシュで Sentry ダッシュボードに受信確認
- [ ] **完了確認**: `eas secret:list` に `EXPO_PUBLIC_SENTRY_DSN` が存在 + Sentry にテストイベント受信

---

### D. ブランチ保護 [M-05-01/01]

- [ ] **手順**:
  1. GitHub リポジトリ Settings > Branches > Add rule
  2. Branch name pattern: `main`
  3. Require a pull request before merging: ON
  4. Require status checks to pass before merging: ON
     - 必須チェック: `test` workflow
  5. Save changes
- [ ] **完了確認**: `gh api repos/{owner}/{repo}/branches/main/protection` → PRレビュー必須 + ステータスチェック必須が有効

---

### E. サブスクリプション価格決定 [M-04-01/13]

- [ ] **決定事項**:
  - 月額: ¥____（推奨: ¥480〜¥980）
  - 年額: ¥____（推奨: 月額 x 10〜11ヶ月分）
  - 無料トライアル: あり / なし（期間: ____日）
- [ ] **完了確認**: 上記が確定し、このファイルに記入済み

---

---

## Phase 2a: M-03/07 ゲート確認

> Phase 1 の B（ドメイン&ホスティング確認）完了後に着手

### F. URL 公開確認 [M-03-04/04]

- [ ] **手順**:
  ```bash
  curl -s -o /dev/null -w "%{http_code}" https://genba-note.app/terms
  curl -s -o /dev/null -w "%{http_code}" https://genba-note.app/privacy
  ```
  両方 `200` が返れば OK。
- [ ] **完了確認**:
  - `curl -s -o /dev/null -w "%{http_code}" https://genba-note.app/terms` → `200`
  - `curl -s -o /dev/null -w "%{http_code}" https://genba-note.app/privacy` → `200`
  - `genba-note/src/constants/legalUrls.ts` のURLが公開URLと一致（確認済み）
- **注意**: この確認が完了すると M-03/07 全体が完了となり、M-04/07 に進める

---

## Phase 2b: ストア設定 & メタデータ

> A-2（M-02-03/07 EAS Submit完了）+ F（M-03-04/04 URL確認）完了後に着手
> 依存: M-02-01/07〜M-02-03/07 + M-03/07 完了が M-04/07 の前提条件

### G. アプリアイコン作成 [M-04-08/13]

- [ ] **要件**:
  - 1024x1024 PNG
  - アルファチャンネルなし（透過不可）
  - App Store / Google Play 両方にアップロード
- [ ] **完了確認**: 両ストアのアプリ情報ページにアイコンが表示されている

### H. ストア商品作成 [M-04-02/13〜M-04-04/13]

#### H-1. App Store Connect サブスク商品 [M-04-02/13]

- [ ] **手順**:
  1. App Store Connect > アプリ > サブスクリプション
  2. サブスクリプショングループ作成（例: "GenBa Note Pro"）
  3. 月額商品作成（参照名、商品ID、価格設定）
  4. 年額商品作成
  5. ローカライズ（日本語の表示名・説明）
- [ ] **完了確認**: 両商品が「提出可能」ステータス

#### H-2. Google Play Console サブスク商品 [M-04-03/13]

- [ ] **手順**:
  1. Google Play Console > アプリ > 収益化 > 定期購入
  2. 月額定期購入作成（商品ID、価格）
  3. 年額定期購入作成
- [ ] **完了確認**: 両商品が作成済み

#### H-3. RevenueCat 商品紐付け [M-04-04/13]

- [ ] **手順**:
  1. https://app.revenuecat.com/ でプロジェクト作成
  2. Apple App を追加（Bundle ID + Shared Secret）
  3. Google App を追加（パッケージ名 + サービスアカウント JSON）
  4. Products にストア商品ID を登録
  5. Entitlement `pro` を作成
  6. Offering を作成し、月額・年額パッケージを追加
- [ ] **完了確認**: RevenueCat ダッシュボードで Entitlement `pro` と Offering（月額・年額）が設定済み + Products に Apple/Google 商品が紐付け済み

---

### I. ストア設定 & メタデータ [M-04-05/13〜M-04-13/13]

#### I-1. App Privacy Labels [M-04-05/13]

- [ ] **手順**: App Store Connect > アプリ > App のプライバシー
  - 収集データ: 購入履歴、クラッシュデータ、識別子、検索履歴
  - トラッキング: なし
  - 詳細は `docs/store-metadata-ja.md` の「App Store プライバシーラベル」セクション参照
- [ ] **完了確認**: プライバシーラベル提出済み

#### I-2. Data Safety [M-04-06/13]

- [ ] **手順**: Google Play Console > アプリ > ポリシー > データセーフティ
  - 詳細は `docs/store-metadata-ja.md` の「Google Play データセーフティ」セクション参照
- [ ] **完了確認**: Data Safety フォーム提出済み

#### I-3. スクリーンショット [M-04-07/13]

- [ ] **手順**:
  1. 実機 or Simulator でアプリを起動
  2. 以下の画面を撮影:
     - 書類一覧、書類作成、PDFプレビュー、課金画面、資材検索（最低5枚）
  3. 必要サイズ: iPhone 6.7"/6.5"、iPad 12.9"、Android スマートフォン
  4. 各ストアにアップロード
  - キャプション案は `docs/store-metadata-ja.md` の「スクリーンショット」セクション参照
- [ ] **完了確認**: 各サイズのスクリーンショット（5枚以上）が App Store Connect / Google Play Console にアップロード済み

#### I-4. App Store カテゴリ等 [M-04-09/13]

- [ ] **手順**: App Store Connect で設定
  - プライマリカテゴリ: ビジネス
  - セカンダリカテゴリ: 仕事効率化
  - 年齢制限: 4+
  - サポートURL: https://genba-note.app
- [ ] **完了確認**: 設定済み

#### I-5. Google Play カテゴリ等 [M-04-10/13]

- [ ] **手順**: Google Play Console で設定
  - カテゴリ: ビジネス
  - コンテンツレーティングアンケート回答
- [ ] **完了確認**: カテゴリ選択 + レーティング提出済み

#### I-6. コンプライアンス + 審査メモ [M-04-11/13]

- [ ] **確認事項**:
  - paywall 画面に価格・期間・解約方法が明記されているか
  - Apple Guideline 3.1.2 準拠
- [ ] **手順**: App Store Connect > 審査メモ に以下を記入:
  - アプリはアカウント登録不要（匿名認証）
  - Pro機能: 書類数制限解除、全テンプレート、透かしなしPDF、CSVエクスポート
  - デモアカウント不要
- [ ] **完了確認**: paywall.tsx の購入画面に価格・期間・解約方法が表示されている + App Store Connect の審査メモ欄に記入済み

#### I-7. 説明文・キーワード入力 [M-04-12/13]

- [ ] **手順**:
  1. `docs/store-metadata-ja.md` の内容を最終レビュー
  2. App Store Connect に説明文・キーワード・プロモーションテキストを入力
  3. Google Play Console に短い説明・詳しい説明を入力
- [ ] **完了確認**: 両ストアに入力済み

#### I-8. アプリ名・サブタイトル [M-04-13/13]

- [ ] **手順**:
  - App Store: アプリ名「GenBa Note」、サブタイトル「建設業の見積書・請求書をかんたん作成」
  - Google Play: アプリ名「GenBa Note - 建設業見積・請求書」
- [ ] **完了確認**: 両ストアに入力済み

---

## Phase 3: RevenueCat シークレット登録

> Phase 2b の H-3（RevenueCat商品紐付け / M-04-04/13）完了後

### J. RevenueCat EAS Secrets [M-02-04/07]

- [ ] **手順**:
  1. RevenueCat ダッシュボード > API Keys > Public API Key をコピー
  2. EAS に登録:
     ```bash
     eas secret:create --name EXPO_PUBLIC_REVENUECAT_PUBLIC_KEY --value <key>
     ```
  3. ローカル `.env` にも追加:
     ```
     EXPO_PUBLIC_REVENUECAT_PUBLIC_KEY=<key>
     ```
- [ ] **完了確認**: `eas secret:list` に `EXPO_PUBLIC_REVENUECAT_PUBLIC_KEY` が存在 + 実機ビルドで RevenueCat 初期化成功

---

## Phase 4: 最終検証 & 提出

> 全 Phase 完了後

### K. 最終検証 [M-06/07]

#### K-1. 本番ビルド [M-06-01/06]

- [ ] **手順**:
  ```bash
  cd genba-note
  eas build --profile production --platform all
  ```
- [ ] **完了確認**: EAS ダッシュボードで iOS / Android 両ビルドが `finished`

#### K-2. iOS サンドボックス課金テスト [M-06-02/06]

- [ ] **手順**:
  1. App Store Connect > ユーザーとアクセス > Sandbox テスター作成
  2. 実機で月額購入 → 復元 → 解約 → 年額購入
  3. RevenueCat ダッシュボードでイベント受信確認
- [ ] **完了確認**: 購入・復元・解約の各操作が成功 + RevenueCat に対応イベント4件以上受信

#### K-3. Android テストトラック課金テスト [M-06-03/06]

- [ ] **手順**:
  1. Google Play Console > 設定 > ライセンステスト にテスターメール追加
  2. 同様の課金フローテスト
- [ ] **完了確認**: 購入・復元・解約の各操作が成功 + RevenueCat に対応イベント受信

#### K-4. TestFlight / 内部テスト配信 [M-06-04/06]

- [ ] **手順**:
  - iOS: `eas submit --platform ios` → TestFlight で配信
  - Android: Google Play Console で内部テストトラックに APK/AAB アップロード
- [ ] **完了確認**: TestFlight でテスターがアプリをインストール可能 + Google Play 内部テストトラックで配信済み

#### K-5. 実機フルフロー確認 [M-06-05/06]

- [ ] **テスト項目**:
  - [ ] 書類作成 → 編集 → PDFプレビュー → PDF共有
  - [ ] 顧客登録 → 写真添付
  - [ ] 資材検索（AI / 楽天）
  - [ ] 課金 → Pro機能解放 → 復元
  - [ ] カレンダー（予定管理）
  - [ ] 収支管理
  - [ ] 設定（発行者情報・テンプレート選択・背景デザイン）
- [ ] **完了確認**: iOS / Android 実機で致命的バグなし

#### K-6. 最終回帰テスト [M-06-06/06]

- [ ] **手順**:
  ```bash
  cd genba-note && npx jest
  cd genba-note && npx tsc --noEmit
  ```
- [ ] **完了確認**: 両コマンドが exit code 0

---

### L. ストア提出 [M-07/07]

#### L-1. App Store 審査提出 [M-07-01/03]

- [ ] **手順**:
  ```bash
  eas submit --platform ios
  ```
- [ ] **完了確認**: App Store Connect でステータスが「審査待ち」または「審査中」

#### L-2. Play Store 審査提出 [M-07-02/03]

- [ ] **手順**:
  ```bash
  eas submit --platform android
  ```
- [ ] **完了確認**: Google Play Console でステータスが「審査中」

#### L-3. 審査対応 [M-07-03/03]

- [ ] リジェクト時は修正 → 再提出（1〜3回は想定内）
- [ ] **完了確認**: 両ストアでアプリが「公開」ステータス

---

## クイックリファレンス

### 重要な既存ファイル

| ファイル | 用途 |
|---------|------|
| `docs/store-metadata-ja.md` | ストア説明文・キーワードのドラフト |
| `docs/privacy/index.html` | プライバシーポリシー HTML（作成済み） |
| `docs/terms/index.html` | 利用規約 HTML（作成済み） |
| `docs/CNAME` | カスタムドメイン設定 |
| `genba-note/eas.json` | EAS Build/Submit 設定（iOS完了） |
| `UNIMPLEMENTED.md` | タスクマスター管理ファイル |

### よく使うコマンド

```bash
# EAS関連
eas secret:list                              # 登録済みシークレット一覧
eas secret:create --name KEY --value VAL     # シークレット登録
eas build --profile production --platform all # 本番ビルド
eas submit --platform ios                     # App Store提出
eas submit --platform android                 # Play Store提出

# Supabase関連
supabase secrets list                         # Supabase シークレット一覧
supabase secrets set KEY=VALUE                # シークレット登録

# 確認用
dig genba-note.app                            # DNS確認
curl -sI https://genba-note.app               # HTTPS確認
```
