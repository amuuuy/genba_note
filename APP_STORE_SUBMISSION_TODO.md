# App Store 審査提出 残りタスク

> ⚠️ **重要 (2026-04-26 更新)**: 本ファイルは v1.0.0 提出時の手順書です。
> v1.0.1 で M1 Pivot により以下を **全廃止** したため、RevenueCat 設定・旧アプリ名「Genba Note」・Pro機能説明・購入履歴/Supabase UUID/AI検索クエリのプライバシーラベル・課金/復元/資材検索フロー確認はすべて **OBSOLETE** です:
> - **アプリ内課金 / Pro サブスクリプション / RevenueCat**（IAP は 2026-04-21 に Remove from Sale 済み）
> - **Supabase 匿名認証 / Edge Functions**
> - **AI資材検索 / 楽天検索 / Google Gemini API（materialResearch ドメイン）**
>
> **v1.0.1 の release gate は 3 点のみ**:
> 1. ローカル機能の実機回帰確認
> 2. Sentry エラーレポート受信確認
> 3. 公開ドキュメント（privacy / terms / store metadata）の整合確認
>
> v1.0.1 提出手順の正本は [`M1_V1_0_1_RELEASE_FIXES.md`](M1_V1_0_1_RELEASE_FIXES.md) と [`docs/store-metadata-ja.md`](docs/store-metadata-ja.md) を参照。
> アプリ正式名は「ポチッと事務」（app.json の `expo.name` 準拠）。
> 本ファイルは v1.0.0 当時の手順として履歴目的で保持しています。
>
> ---

> 作成日: 2026-03-26
> 対象: iOS App Store（Android は後回し）
> 状態: PR #5 マージ済み、テスト全パス（130 suites / 2589 tests）

---

## 完了済み

- [x] PR #5（SecureStore移行 + セキュリティ強化）を main にマージ
- [x] テスト実行: jest 全パス + tsc --noEmit クリーン
- [x] `ITSAppUsesNonExemptEncryption: false` を app.json に設定済み
- [x] ドメイン法務ページ公開済み（genba-note.app/terms/, /privacy/）
- [x] スクリーンショット撮影済み（iPhone 6.7" 7枚 + iPad 12.9" 7枚）
- [x] ストアメタデータ作成済み（docs/store-metadata-ja.md）
- [x] EAS Secrets 設定済み（EXPO_PUBLIC_REVENUECAT_PUBLIC_KEY, EXPO_PUBLIC_SENTRY_DSN）

---

## Step 1: RevenueCat ダッシュボード確認（ブラウザ）

- [ ] Entitlement `pro` が存在すること
- [ ] Offering `default` に Monthly / Yearly パッケージが紐付いていること
- [ ] Products に Apple サブスク商品（genbanote_pro_monthly_v1 等）が紐付いていること

## Step 2: 本番ビルド（ターミナル）

```bash
cd genba-note
eas build --profile production --platform ios
```

- ビルド番号は自動増加（autoIncrement: true）
- `ITSAppUsesNonExemptEncryption: false` が IPA に埋め込まれる → 輸出コンプライアンスエラー解消
- ビルド完了まで約15〜30分

## Step 3: App Store Connect へアップロード（ターミナル）

```bash
cd genba-note
eas submit --platform ios
```

設定済み: appleId=kenjimu48@gmail.com, ascAppId=6760102152, appleTeamId=6M8W2U5GAB

## Step 4: App Store Connect メタデータ入力（ブラウザ）

ビルド待ち中に並行して作業可能:

### スクリーンショット
- [ ] iPhone 6.7" スクリーンショット 7枚アップロード（写真/iPhone_6.7inch/）
- [ ] iPad 12.9" スクリーンショット 7枚アップロード（写真/iPad_12.9inch/）

### アプリ情報（docs/store-metadata-ja.md から転記）
- [ ] アプリ名: Genba Note
- [ ] サブタイトル: 建設業の見積書・請求書をかんたん作成
- [ ] 説明文をコピー
- [ ] キーワードをコピー
- [ ] 新機能テキスト（v1.0.0）をコピー
- [ ] サポートURL: https://genba-note.app
- [ ] プライバシーポリシーURL: https://genba-note.app/privacy/

### カテゴリ・年齢制限
- [ ] プライマリカテゴリ: ビジネス
- [ ] セカンダリカテゴリ: 仕事効率化
- [ ] 年齢制限: 4+

### App Privacy Labels
- [ ] 購入履歴: ユーザーに紐付け（RevenueCat でサブスク状態管理）
- [ ] 診断データ: ユーザーに紐付けなし（Sentry クラッシュレポート）
- [ ] 識別子: ユーザーに紐付け（Supabase 匿名認証 UUID）
- [ ] 検索履歴: ユーザーに紐付けなし（AI/楽天検索クエリ）

### 審査メモ
- [ ] 以下を記入:

```
このアプリは匿名認証を使用しているため、デモアカウントは不要です。
アプリを起動すると、すべてのFree機能をすぐにお試しいただけます。

【Pro機能（サブスクリプション）】
・書類作成数の無制限化
・追加テンプレート（4種類）
・AI資材検索（Gemini連携）
・背景デザインのカスタマイズ

サブスクリプションの管理・解約は iOS の「設定 > サブスクリプション」から行えます。
```

## Step 5: ビルド選択・審査提出（ブラウザ）

- [ ] App Store Connect > アプリバージョン > ビルドセクションで新ビルドを選択
- [ ] 輸出コンプライアンスエラーが消えていることを確認
- [ ] 全メタデータが入力済みであることを確認
- [ ] 「審査に提出」をクリック

---

## オプション: TestFlight テスト（推奨）

審査提出前に実機テストを行う場合:

- [ ] TestFlight でテスターとして自分を追加
- [ ] Sandbox Tester アカウント作成（App Store Connect > Users > Sandbox Testers）
- [ ] 実機で月額購入 → 復元 → 解約 → 年額購入をテスト
- [ ] RevenueCat ダッシュボードでイベント受信確認
- [ ] 主要フロー確認: 書類作成 → PDF → 顧客管理 → 資材検索 → 課金 → 設定

---

## 注意: シミュレータのクラッシュについて

開発中にシミュレータで「GenBaNote が予期しない理由で終了しました」と表示される場合がありますが、
これは React Native デバッガー（jsinspector）の既知の問題で、本番ビルドには影響しません。
