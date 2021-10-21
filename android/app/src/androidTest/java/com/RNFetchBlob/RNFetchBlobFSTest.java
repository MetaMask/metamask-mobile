package com.RNFetchBlob;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;

import junit.framework.TestCase;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static com.RNFetchBlob.RNFetchBlobConst.RNFB_RESPONSE_UTF8;

public class RNFetchBlobFSTest extends TestCase {
	String testPersist = "{\"collectibles\":\"{\\\"favorites\\\":{}}\",\"engine\":\"{\\\"backgroundState\\\":{\\\"AccountTrackerController\\\":{\\\"accounts\\\":{\\\"0x223367C61c38facBDd0B92De5aa7B742e1E5a19A\\\":{\\\"balance\\\":\\\"0x0\\\"}}},\\\"AddressBookController\\\":{\\\"addressBook\\\":{}},\\\"AssetsContractController\\\":{},\\\"CollectiblesController\\\":{\\\"allCollectibleContracts\\\":{},\\\"allCollectibles\\\":{},\\\"collectibleContracts\\\":[],\\\"collectibles\\\":[],\\\"ignoredCollectibles\\\":[]},\\\"AssetsDetectionController\\\":{},\\\"TokenListController\\\":{\\\"tokenList\\\":{\\\"0x3fa400483487A489EC9b1dB29C4129063EEC4654\\\":{\\\"name\\\":\\\"Cryptokek.com\\\",\\\"symbol\\\":\\\"KEK\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x3fa400483487A489EC9b1dB29C4129063EEC4654\\\",\\\"iconUrl\\\":\\\"cryptokek.svg\\\",\\\"occurrences\\\":null},\\\"0x4Cf89ca06ad997bC732Dc876ed2A7F26a9E7f361\\\":{\\\"name\\\":\\\"Mysterium\\\",\\\"symbol\\\":\\\"MYST\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x4Cf89ca06ad997bC732Dc876ed2A7F26a9E7f361\\\",\\\"iconUrl\\\":\\\"MYST.svg\\\",\\\"occurrences\\\":null},\\\"0x697eF32B4a3F5a4C39dE1cB7563f24CA7BfC5947\\\":{\\\"name\\\":\\\"Insula Token\\\",\\\"symbol\\\":\\\"ISLA\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x697eF32B4a3F5a4C39dE1cB7563f24CA7BfC5947\\\",\\\"iconUrl\\\":\\\"Insula.svg\\\",\\\"occurrences\\\":null},\\\"0x62Dc4817588d53a056cBbD18231d91ffCcd34b2A\\\":{\\\"name\\\":\\\"DeHive\\\",\\\"erc721\\\":false,\\\"symbol\\\":\\\"DHV\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x62Dc4817588d53a056cBbD18231d91ffCcd34b2A\\\",\\\"iconUrl\\\":\\\"dehive.svg\\\",\\\"occurrences\\\":null},\\\"0x8400D94A5cb0fa0D041a3788e395285d61c9ee5e\\\":{\\\"name\\\":\\\"Unibright\\\",\\\"symbol\\\":\\\"UBT\\\",\\\"decimals\\\":8,\\\"address\\\":\\\"0x8400D94A5cb0fa0D041a3788e395285d61c9ee5e\\\",\\\"iconUrl\\\":\\\"ubt.svg\\\",\\\"occurrences\\\":null},\\\"0xfAd45E47083e4607302aa43c65fB3106F1cd7607\\\":{\\\"name\\\":\\\"Hoge Finance\\\",\\\"symbol\\\":\\\"HOGE\\\",\\\"decimals\\\":9,\\\"address\\\":\\\"0xfAd45E47083e4607302aa43c65fB3106F1cd7607\\\",\\\"iconUrl\\\":\\\"HogeFinanceLogo.svg\\\",\\\"occurrences\\\":null},\\\"0xBB0E17EF65F82Ab018d8EDd776e8DD940327B28b\\\":{\\\"name\\\":\\\"Axie Infinity Shard\\\",\\\"symbol\\\":\\\"AXS\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xBB0E17EF65F82Ab018d8EDd776e8DD940327B28b\\\",\\\"iconUrl\\\":\\\"AXS.svg\\\",\\\"occurrences\\\":null},\\\"0xCC8Fa225D80b9c7D42F96e9570156c65D6cAAa25\\\":{\\\"name\\\":\\\"Smooth Love Potion\\\",\\\"symbol\\\":\\\"SLP\\\",\\\"decimals\\\":0,\\\"address\\\":\\\"0xCC8Fa225D80b9c7D42F96e9570156c65D6cAAa25\\\",\\\"iconUrl\\\":\\\"SLP.svg\\\",\\\"occurrences\\\":null},\\\"0x10633216E7E8281e33c86F02Bf8e565a635D9770\\\":{\\\"name\\\":\\\"Dvision Network\\\",\\\"symbol\\\":\\\"DVI\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x10633216E7E8281e33c86F02Bf8e565a635D9770\\\",\\\"iconUrl\\\":\\\"dvision.svg\\\",\\\"occurrences\\\":null},\\\"0x898BAD2774EB97cF6b94605677F43b41871410B1\\\":{\\\"name\\\":\\\"vEth2\\\",\\\"symbol\\\":\\\"vEth2\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x898BAD2774EB97cF6b94605677F43b41871410B1\\\",\\\"iconUrl\\\":\\\"vEth2.svg\\\",\\\"occurrences\\\":null},\\\"0xE94B97b6b43639E238c851A7e693F50033EfD75C\\\":{\\\"name\\\":\\\"Rainbow Token\\\",\\\"symbol\\\":\\\"RNBW\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xE94B97b6b43639E238c851A7e693F50033EfD75C\\\",\\\"iconUrl\\\":\\\"halodao-rnbw.svg\\\",\\\"occurrences\\\":null},\\\"0x47BE779De87de6580d0548cde80710a93c502405\\\":{\\\"name\\\":\\\"Rainbow Pool\\\",\\\"symbol\\\":\\\"xRNBW\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x47BE779De87de6580d0548cde80710a93c502405\\\",\\\"iconUrl\\\":\\\"halodao-xrnbw.svg\\\",\\\"occurrences\\\":null},\\\"0xe7aE6D0C56CACaf007b7e4d312f9af686a9E9a04\\\":{\\\"name\\\":\\\"Vabble\\\",\\\"symbol\\\":\\\"VAB\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xe7aE6D0C56CACaf007b7e4d312f9af686a9E9a04\\\",\\\"iconUrl\\\":\\\"VAB.svg\\\",\\\"occurrences\\\":null},\\\"0x853d955aCEf822Db058eb8505911ED77F175b99e\\\":{\\\"name\\\":\\\"Frax\\\",\\\"symbol\\\":\\\"FRAX\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x853d955aCEf822Db058eb8505911ED77F175b99e\\\",\\\"iconUrl\\\":\\\"frax.svg\\\",\\\"occurrences\\\":null},\\\"0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0\\\":{\\\"name\\\":\\\"Frax Share\\\",\\\"symbol\\\":\\\"FXS\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0\\\",\\\"iconUrl\\\":\\\"fxs.svg\\\",\\\"occurrences\\\":null},\\\"0x84810bcF08744d5862B8181f12d17bfd57d3b078\\\":{\\\"name\\\":\\\"SharedStake\\\",\\\"symbol\\\":\\\"SGT\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x84810bcF08744d5862B8181f12d17bfd57d3b078\\\",\\\"iconUrl\\\":\\\"sharedstake.svg\\\",\\\"occurrences\\\":null},\\\"0x75387e1287Dd85482aB66102DA9f6577E027f609\\\":{\\\"name\\\":\\\"MindsyncAI\\\",\\\"symbol\\\":\\\"MAI\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x75387e1287Dd85482aB66102DA9f6577E027f609\\\",\\\"iconUrl\\\":\\\"MAI.svg\\\",\\\"occurrences\\\":null},\\\"0x196f4727526eA7FB1e17b2071B3d8eAA38486988\\\":{\\\"name\\\":\\\"Reserve\\\",\\\"symbol\\\":\\\"RSV\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x196f4727526eA7FB1e17b2071B3d8eAA38486988\\\",\\\"iconUrl\\\":\\\"rsv.svg\\\",\\\"occurrences\\\":null},\\\"0x8762db106B2c2A0bccB3A80d1Ed41273552616E8\\\":{\\\"name\\\":\\\"Reserve Rights\\\",\\\"symbol\\\":\\\"RSR\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x8762db106B2c2A0bccB3A80d1Ed41273552616E8\\\",\\\"iconUrl\\\":\\\"rsr.svg\\\",\\\"occurrences\\\":null},\\\"0x1cF4592ebfFd730c7dc92c1bdFFDfc3B9EfCf29a\\\":{\\\"name\\\":\\\"WAVES\\\",\\\"symbol\\\":\\\"WAVES\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x1cF4592ebfFd730c7dc92c1bdFFDfc3B9EfCf29a\\\",\\\"iconUrl\\\":\\\"waves.svg\\\",\\\"occurrences\\\":null},\\\"0x252739487C1fa66eaeaE7CED41d6358aB2a6bCa9\\\":{\\\"name\\\":\\\"ArCoin\\\",\\\"symbol\\\":\\\"RCOIN\\\",\\\"decimals\\\":8,\\\"address\\\":\\\"0x252739487C1fa66eaeaE7CED41d6358aB2a6bCa9\\\",\\\"iconUrl\\\":\\\"ArCoin.svg\\\",\\\"occurrences\\\":null},\\\"0x18aAA7115705e8be94bfFEBDE57Af9BFc265B998\\\":{\\\"name\\\":\\\"Audius\\\",\\\"symbol\\\":\\\"AUDIO\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x18aAA7115705e8be94bfFEBDE57Af9BFc265B998\\\",\\\"iconUrl\\\":\\\"audius.svg\\\",\\\"occurrences\\\":null},\\\"0x8E3BCC334657560253B83f08331d85267316e08a\\\":{\\\"name\\\":\\\"Rubic\\\",\\\"symbol\\\":\\\"BRBC\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x8E3BCC334657560253B83f08331d85267316e08a\\\",\\\"iconUrl\\\":\\\"brbc.svg\\\",\\\"occurrences\\\":null},\\\"0xca1207647Ff814039530D7d35df0e1Dd2e91Fa84\\\":{\\\"name\\\":\\\"dHEDGE DAO Token\\\",\\\"symbol\\\":\\\"DHT\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xca1207647Ff814039530D7d35df0e1Dd2e91Fa84\\\",\\\"iconUrl\\\":\\\"DHT.svg\\\",\\\"occurrences\\\":null},\\\"0x6243d8CEA23066d098a15582d81a598b4e8391F4\\\":{\\\"name\\\":\\\"Reflexer Ungovernance Token\\\",\\\"symbol\\\":\\\"FLX\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x6243d8CEA23066d098a15582d81a598b4e8391F4\\\",\\\"iconUrl\\\":\\\"flx.svg\\\",\\\"occurrences\\\":null},\\\"0x03ab458634910AaD20eF5f1C8ee96F1D6ac54919\\\":{\\\"name\\\":\\\"Rai Reflex Index\\\",\\\"symbol\\\":\\\"RAI\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x03ab458634910AaD20eF5f1C8ee96F1D6ac54919\\\",\\\"iconUrl\\\":\\\"rai.svg\\\",\\\"occurrences\\\":null},\\\"0xF25c91C87e0B1fd9B4064Af0F427157AaB0193A7\\\":{\\\"name\\\":\\\"BASIC Token\\\",\\\"symbol\\\":\\\"BASIC\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xF25c91C87e0B1fd9B4064Af0F427157AaB0193A7\\\",\\\"iconUrl\\\":\\\"basic.svg\\\",\\\"occurrences\\\":null},\\\"0x53C8395465A84955c95159814461466053DedEDE\\\":{\\\"name\\\":\\\"DeGate Token\\\",\\\"symbol\\\":\\\"DG\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x53C8395465A84955c95159814461466053DedEDE\\\",\\\"iconUrl\\\":\\\"DG.svg\\\",\\\"occurrences\\\":null},\\\"0xBCf9dBf8B14eD096B2BA08b7269356197fDd1b5D\\\":{\\\"name\\\":\\\"Avaluse\\\",\\\"symbol\\\":\\\"AVAL\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xBCf9dBf8B14eD096B2BA08b7269356197fDd1b5D\\\",\\\"iconUrl\\\":\\\"avaluse.svg\\\",\\\"occurrences\\\":null},\\\"0x6E765D26388A17A6e86c49A8E41DF3F58aBcd337\\\":{\\\"name\\\":\\\"Kangal\\\",\\\"symbol\\\":\\\"KANGAL\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x6E765D26388A17A6e86c49A8E41DF3F58aBcd337\\\",\\\"iconUrl\\\":\\\"kangal.svg\\\",\\\"occurrences\\\":null},\\\"0x9AF4f26941677C706cfEcf6D3379FF01bB85D5Ab\\\":{\\\"name\\\":\\\"DomRaiderToken\\\",\\\"symbol\\\":\\\"DRT\\\",\\\"decimals\\\":8,\\\"address\\\":\\\"0x9AF4f26941677C706cfEcf6D3379FF01bB85D5Ab\\\",\\\"iconUrl\\\":\\\"drt.svg\\\",\\\"occurrences\\\":null},\\\"0x06B179e292f080871825beD5D722162fD96B4c95\\\":{\\\"name\\\":\\\"10x.gg\\\",\\\"symbol\\\":\\\"XGG\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x06B179e292f080871825beD5D722162fD96B4c95\\\",\\\"iconUrl\\\":\\\"xgg.svg\\\",\\\"occurrences\\\":null},\\\"0xF29992D7b589A0A6bD2de7Be29a97A6EB73EaF85\\\":{\\\"name\\\":\\\"DMScript\\\",\\\"symbol\\\":\\\"DMST\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xF29992D7b589A0A6bD2de7Be29a97A6EB73EaF85\\\",\\\"iconUrl\\\":\\\"dmst.svg\\\",\\\"occurrences\\\":null},\\\"0xDd1Ad9A21Ce722C151A836373baBe42c868cE9a4\\\":{\\\"name\\\":\\\"Universal Basic Income\\\",\\\"symbol\\\":\\\"UBI\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xDd1Ad9A21Ce722C151A836373baBe42c868cE9a4\\\",\\\"iconUrl\\\":\\\"ubi.svg\\\",\\\"occurrences\\\":null},\\\"0xf293d23BF2CDc05411Ca0edDD588eb1977e8dcd4\\\":{\\\"name\\\":\\\"Sylo\\\",\\\"symbol\\\":\\\"SYLO\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xf293d23BF2CDc05411Ca0edDD588eb1977e8dcd4\\\",\\\"iconUrl\\\":\\\"SYLO.svg\\\",\\\"occurrences\\\":null},\\\"0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84\\\":{\\\"name\\\":\\\"Liquid staked Ether 2.0\\\",\\\"symbol\\\":\\\"stETH\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84\\\",\\\"iconUrl\\\":\\\"stETH.svg\\\",\\\"occurrences\\\":null},\\\"0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0\\\":{\\\"name\\\":\\\"Wrapped liquid staked Ether 2.0\\\",\\\"symbol\\\":\\\"wstETH\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0\\\",\\\"iconUrl\\\":\\\"wstETH.svg\\\",\\\"occurrences\\\":null},\\\"0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32\\\":{\\\"name\\\":\\\"Lido DAO Token\\\",\\\"symbol\\\":\\\"LDO\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32\\\",\\\"iconUrl\\\":\\\"LDO.svg\\\",\\\"occurrences\\\":null},\\\"0xd2877702675e6cEb975b4A1dFf9fb7BAF4C91ea9\\\":{\\\"name\\\":\\\"Wrapped LUNA Token\\\",\\\"symbol\\\":\\\"LUNA\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xd2877702675e6cEb975b4A1dFf9fb7BAF4C91ea9\\\",\\\"iconUrl\\\":\\\"Luna.svg\\\",\\\"occurrences\\\":null},\\\"0xa47c8bf37f92aBed4A126BDA807A7b7498661acD\\\":{\\\"name\\\":\\\"Wrapped UST Token\\\",\\\"symbol\\\":\\\"UST\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xa47c8bf37f92aBed4A126BDA807A7b7498661acD\\\",\\\"iconUrl\\\":\\\"UST.svg\\\",\\\"occurrences\\\":null},\\\"0xcAAfF72A8CbBfc5Cf343BA4e26f65a257065bFF1\\\":{\\\"name\\\":\\\"Wrapped KRT Token\\\",\\\"symbol\\\":\\\"KRT\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xcAAfF72A8CbBfc5Cf343BA4e26f65a257065bFF1\\\",\\\"iconUrl\\\":\\\"KRT.svg\\\",\\\"occurrences\\\":null},\\\"0x676Ad1b33ae6423c6618C1AEcf53BAa29cf39EE5\\\":{\\\"name\\\":\\\"Wrapped SDT Token\\\",\\\"symbol\\\":\\\"SDT\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x676Ad1b33ae6423c6618C1AEcf53BAa29cf39EE5\\\",\\\"iconUrl\\\":\\\"SDT.svg\\\",\\\"occurrences\\\":null},\\\"0x156B36ec68FdBF84a925230BA96cb1Ca4c4bdE45\\\":{\\\"name\\\":\\\"Wrapped MNT Token\\\",\\\"symbol\\\":\\\"MNT\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x156B36ec68FdBF84a925230BA96cb1Ca4c4bdE45\\\",\\\"iconUrl\\\":\\\"MNT.svg\\\",\\\"occurrences\\\":null},\\\"0x09a3EcAFa817268f77BE1283176B946C4ff2E608\\\":{\\\"name\\\":\\\"Wrapped MIR Token\\\",\\\"symbol\\\":\\\"MIR\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x09a3EcAFa817268f77BE1283176B946C4ff2E608\\\",\\\"iconUrl\\\":\\\"MIR.svg\\\",\\\"occurrences\\\":null},\\\"0xd36932143F6eBDEDD872D5Fb0651f4B72Fd15a84\\\":{\\\"name\\\":\\\"Wrapped Mirror AAPL Token\\\",\\\"symbol\\\":\\\"mAAPL\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xd36932143F6eBDEDD872D5Fb0651f4B72Fd15a84\\\",\\\"iconUrl\\\":\\\"mAAPL.svg\\\",\\\"occurrences\\\":null},\\\"0x59A921Db27Dd6d4d974745B7FfC5c33932653442\\\":{\\\"name\\\":\\\"Wrapped Mirror GOOGL Token\\\",\\\"symbol\\\":\\\"mGOOGL\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x59A921Db27Dd6d4d974745B7FfC5c33932653442\\\",\\\"iconUrl\\\":\\\"mGOOGL.svg\\\",\\\"occurrences\\\":null},\\\"0x21cA39943E91d704678F5D00b6616650F066fD63\\\":{\\\"name\\\":\\\"Wrapped Mirror TSLA Token\\\",\\\"symbol\\\":\\\"mTSLA\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x21cA39943E91d704678F5D00b6616650F066fD63\\\",\\\"iconUrl\\\":\\\"mTSLA.svg\\\",\\\"occurrences\\\":null},\\\"0xC8d674114bac90148d11D3C1d33C61835a0F9DCD\\\":{\\\"name\\\":\\\"Wrapped Mirror NFLX Token\\\",\\\"symbol\\\":\\\"mNFLX\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xC8d674114bac90148d11D3C1d33C61835a0F9DCD\\\",\\\"iconUrl\\\":\\\"mNFLX.svg\\\",\\\"occurrences\\\":null},\\\"0x13B02c8dE71680e71F0820c996E4bE43c2F57d15\\\":{\\\"name\\\":\\\"Wrapped Mirror QQQ Token\\\",\\\"symbol\\\":\\\"mQQQ\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x13B02c8dE71680e71F0820c996E4bE43c2F57d15\\\",\\\"iconUrl\\\":\\\"mQQQ.svg\\\",\\\"occurrences\\\":null},\\\"0xEdb0414627E6f1e3F082DE65cD4F9C693D78CCA9\\\":{\\\"name\\\":\\\"Wrapped Mirror TWTR Token\\\",\\\"symbol\\\":\\\"mTWTR\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xEdb0414627E6f1e3F082DE65cD4F9C693D78CCA9\\\",\\\"iconUrl\\\":\\\"mTWTR.svg\\\",\\\"occurrences\\\":null},\\\"0x41BbEDd7286dAab5910a1f15d12CBda839852BD7\\\":{\\\"name\\\":\\\"Wrapped Mirror MSFT Token\\\",\\\"symbol\\\":\\\"mMSFT\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x41BbEDd7286dAab5910a1f15d12CBda839852BD7\\\",\\\"iconUrl\\\":\\\"mMSFT.svg\\\",\\\"occurrences\\\":null},\\\"0x0cae9e4d663793c2a2A0b211c1Cf4bBca2B9cAa7\\\":{\\\"name\\\":\\\"Wrapped Mirror AMZN Token\\\",\\\"symbol\\\":\\\"mAMZN\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x0cae9e4d663793c2a2A0b211c1Cf4bBca2B9cAa7\\\",\\\"iconUrl\\\":\\\"mAMZN.svg\\\",\\\"occurrences\\\":null},\\\"0x56aA298a19C93c6801FDde870fA63EF75Cc0aF72\\\":{\\\"name\\\":\\\"Wrapped Mirror BABA Token\\\",\\\"symbol\\\":\\\"mBABA\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x56aA298a19C93c6801FDde870fA63EF75Cc0aF72\\\",\\\"iconUrl\\\":\\\"mBABA.svg\\\",\\\"occurrences\\\":null},\\\"0x1d350417d9787E000cc1b95d70E9536DcD91F373\\\":{\\\"name\\\":\\\"Wrapped Mirror IAU Token\\\",\\\"symbol\\\":\\\"mIAU\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x1d350417d9787E000cc1b95d70E9536DcD91F373\\\",\\\"iconUrl\\\":\\\"mIAU.svg\\\",\\\"occurrences\\\":null},\\\"0x9d1555d8cB3C846Bb4f7D5B1B1080872c3166676\\\":{\\\"name\\\":\\\"Wrapped Mirror SLV Token\\\",\\\"symbol\\\":\\\"mSLV\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x9d1555d8cB3C846Bb4f7D5B1B1080872c3166676\\\",\\\"iconUrl\\\":\\\"mSLV.svg\\\",\\\"occurrences\\\":null},\\\"0x31c63146a635EB7465e5853020b39713AC356991\\\":{\\\"name\\\":\\\"Wrapped Mirror USO Token\\\",\\\"symbol\\\":\\\"mUSO\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x31c63146a635EB7465e5853020b39713AC356991\\\",\\\"iconUrl\\\":\\\"mUSO.svg\\\",\\\"occurrences\\\":null},\\\"0xf72FCd9DCF0190923Fadd44811E240Ef4533fc86\\\":{\\\"name\\\":\\\"Wrapped Mirror VIXY Token\\\",\\\"symbol\\\":\\\"mVIXY\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xf72FCd9DCF0190923Fadd44811E240Ef4533fc86\\\",\\\"iconUrl\\\":\\\"mVIXY.svg\\\",\\\"occurrences\\\":null},\\\"0x21BfBDa47A0B4B5b1248c767Ee49F7caA9B23697\\\":{\\\"name\\\":\\\"OVR\\\",\\\"symbol\\\":\\\"OVR\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x21BfBDa47A0B4B5b1248c767Ee49F7caA9B23697\\\",\\\"iconUrl\\\":\\\"OVR.svg\\\",\\\"occurrences\\\":null},\\\"0x4691937a7508860F876c9c0a2a617E7d9E945D4B\\\":{\\\"name\\\":\\\"Wootrade Network\\\",\\\"symbol\\\":\\\"WOO\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x4691937a7508860F876c9c0a2a617E7d9E945D4B\\\",\\\"iconUrl\\\":\\\"wootrade.svg\\\",\\\"occurrences\\\":null},\\\"0x40FD72257597aA14C7231A7B1aaa29Fce868F677\\\":{\\\"name\\\":\\\"Sora Token\\\",\\\"symbol\\\":\\\"XOR\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x40FD72257597aA14C7231A7B1aaa29Fce868F677\\\",\\\"iconUrl\\\":\\\"xor.svg\\\",\\\"occurrences\\\":null},\\\"0xe88f8313e61A97cEc1871EE37fBbe2a8bf3ed1E4\\\":{\\\"name\\\":\\\"Sora Validator Token\\\",\\\"symbol\\\":\\\"VAL\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xe88f8313e61A97cEc1871EE37fBbe2a8bf3ed1E4\\\",\\\"iconUrl\\\":\\\"val.svg\\\",\\\"occurrences\\\":null},\\\"0xaf9f549774ecEDbD0966C52f250aCc548D3F36E5\\\":{\\\"name\\\":\\\"RFUEL\\\",\\\"symbol\\\":\\\"RFUEL\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xaf9f549774ecEDbD0966C52f250aCc548D3F36E5\\\",\\\"iconUrl\\\":\\\"RFUEL.svg\\\",\\\"occurrences\\\":null},\\\"0x7420B4b9a0110cdC71fB720908340C03F9Bc03EC\\\":{\\\"name\\\":\\\"JasmyCoin\\\",\\\"symbol\\\":\\\"JASMY\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x7420B4b9a0110cdC71fB720908340C03F9Bc03EC\\\",\\\"iconUrl\\\":\\\"JASMY.svg\\\",\\\"occurrences\\\":null},\\\"0x947AEb02304391f8fbE5B25D7D98D649b57b1788\\\":{\\\"name\\\":\\\"Mandala Exchange Token\\\",\\\"symbol\\\":\\\"MDX\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x947AEb02304391f8fbE5B25D7D98D649b57b1788\\\",\\\"iconUrl\\\":\\\"mandala.svg\\\",\\\"occurrences\\\":null},\\\"0xCdeee767beD58c5325f68500115d4B722b3724EE\\\":{\\\"name\\\":\\\"Carbon\\\",\\\"symbol\\\":\\\"CRBN\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xCdeee767beD58c5325f68500115d4B722b3724EE\\\",\\\"iconUrl\\\":\\\"CRBN.svg\\\",\\\"occurrences\\\":null},\\\"0xA4EED63db85311E22dF4473f87CcfC3DaDCFA3E3\\\":{\\\"name\\\":\\\"Rubic\\\",\\\"symbol\\\":\\\"RBC\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xA4EED63db85311E22dF4473f87CcfC3DaDCFA3E3\\\",\\\"iconUrl\\\":\\\"Rubic.svg\\\",\\\"occurrences\\\":null},\\\"0x3A880652F47bFaa771908C07Dd8673A787dAEd3A\\\":{\\\"name\\\":\\\"DerivaDAO\\\",\\\"symbol\\\":\\\"DDX\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x3A880652F47bFaa771908C07Dd8673A787dAEd3A\\\",\\\"iconUrl\\\":\\\"DDX.svg\\\",\\\"occurrences\\\":null},\\\"0xbC396689893D065F41bc2C6EcbeE5e0085233447\\\":{\\\"name\\\":\\\"Perpetual\\\",\\\"symbol\\\":\\\"PERP\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xbC396689893D065F41bc2C6EcbeE5e0085233447\\\",\\\"iconUrl\\\":\\\"PERP.svg\\\",\\\"occurrences\\\":null},\\\"0xeca82185adCE47f39c684352B0439f030f860318\\\":{\\\"name\\\":\\\"Perlin\\\",\\\"symbol\\\":\\\"PERL\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xeca82185adCE47f39c684352B0439f030f860318\\\",\\\"iconUrl\\\":\\\"PERL.svg\\\",\\\"occurrences\\\":null},\\\"0xA1AFFfE3F4D611d252010E3EAf6f4D77088b0cd7\\\":{\\\"name\\\":\\\"Reflect Finance\\\",\\\"symbol\\\":\\\"RFI\\\",\\\"decimals\\\":9,\\\"address\\\":\\\"0xA1AFFfE3F4D611d252010E3EAf6f4D77088b0cd7\\\",\\\"iconUrl\\\":\\\"RFI.svg\\\",\\\"occurrences\\\":null},\\\"0xC0bA369c8Db6eB3924965e5c4FD0b4C1B91e305F\\\":{\\\"name\\\":\\\"DLP Duck Token\\\",\\\"symbol\\\":\\\"DUCK\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xC0bA369c8Db6eB3924965e5c4FD0b4C1B91e305F\\\",\\\"iconUrl\\\":\\\"dlpducktoken.svg\\\",\\\"occurrences\\\":null},\\\"0xFbEEa1C75E4c4465CB2FCCc9c6d6afe984558E20\\\":{\\\"name\\\":\\\"DuckDaoDime\\\",\\\"symbol\\\":\\\"DDIM\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xFbEEa1C75E4c4465CB2FCCc9c6d6afe984558E20\\\",\\\"iconUrl\\\":\\\"ddim.svg\\\",\\\"occurrences\\\":null},\\\"0xB4d930279552397bbA2ee473229f89Ec245bc365\\\":{\\\"name\\\":\\\"MahaDAO\\\",\\\"symbol\\\":\\\"MAHA\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xB4d930279552397bbA2ee473229f89Ec245bc365\\\",\\\"iconUrl\\\":\\\"MAHA.svg\\\",\\\"occurrences\\\":null},\\\"0x3231Cb76718CDeF2155FC47b5286d82e6eDA273f\\\":{\\\"name\\\":\\\"Monerium EUR\\\",\\\"symbol\\\":\\\"EURe\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x3231Cb76718CDeF2155FC47b5286d82e6eDA273f\\\",\\\"iconUrl\\\":\\\"EURe.svg\\\",\\\"occurrences\\\":null},\\\"0x7ba92741Bf2A568abC6f1D3413c58c6e0244F8fD\\\":{\\\"name\\\":\\\"Monerium GBP\\\",\\\"symbol\\\":\\\"GBPe\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x7ba92741Bf2A568abC6f1D3413c58c6e0244F8fD\\\",\\\"iconUrl\\\":\\\"GBPe.svg\\\",\\\"occurrences\\\":null},\\\"0xBc5142e0CC5eB16b47c63B0f033d4c2480853a52\\\":{\\\"name\\\":\\\"Monerium USD\\\",\\\"symbol\\\":\\\"USDe\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xBc5142e0CC5eB16b47c63B0f033d4c2480853a52\\\",\\\"iconUrl\\\":\\\"USDe.svg\\\",\\\"occurrences\\\":null},\\\"0xC642549743A93674cf38D6431f75d6443F88E3E2\\\":{\\\"name\\\":\\\"Monerium ISK\\\",\\\"symbol\\\":\\\"ISKe\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xC642549743A93674cf38D6431f75d6443F88E3E2\\\",\\\"iconUrl\\\":\\\"ISKe.svg\\\",\\\"occurrences\\\":null},\\\"0x66a0f676479Cee1d7373f3DC2e2952778BfF5bd6\\\":{\\\"name\\\":\\\"WISE Token\\\",\\\"symbol\\\":\\\"WISE\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x66a0f676479Cee1d7373f3DC2e2952778BfF5bd6\\\",\\\"iconUrl\\\":\\\"wise.svg\\\",\\\"occurrences\\\":null},\\\"0x72F020f8f3E8fd9382705723Cd26380f8D0c66Bb\\\":{\\\"name\\\":\\\"PlotX\\\",\\\"symbol\\\":\\\"PLOT\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x72F020f8f3E8fd9382705723Cd26380f8D0c66Bb\\\",\\\"iconUrl\\\":\\\"plotx.svg\\\",\\\"occurrences\\\":null},\\\"0x44197A4c44D6A059297cAf6be4F7e172BD56Caaf\\\":{\\\"name\\\":\\\"ELTCOIN\\\",\\\"symbol\\\":\\\"ELT\\\",\\\"decimals\\\":8,\\\"address\\\":\\\"0x44197A4c44D6A059297cAf6be4F7e172BD56Caaf\\\",\\\"iconUrl\\\":\\\"ELTCOIN.svg\\\",\\\"occurrences\\\":null},\\\"0x6781a0F84c7E9e846DCb84A9a5bd49333067b104\\\":{\\\"name\\\":\\\"ZAP TOKEN\\\",\\\"symbol\\\":\\\"ZAP\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x6781a0F84c7E9e846DCb84A9a5bd49333067b104\\\",\\\"iconUrl\\\":\\\"zapicon.svg\\\",\\\"occurrences\\\":null},\\\"0x00c83aeCC790e8a4453e5dD3B0B4b3680501a7A7\\\":{\\\"name\\\":\\\"SKALE\\\",\\\"symbol\\\":\\\"SKL\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x00c83aeCC790e8a4453e5dD3B0B4b3680501a7A7\\\",\\\"iconUrl\\\":\\\"skl.svg\\\",\\\"occurrences\\\":null},\\\"0x674C6Ad92Fd080e4004b2312b45f796a192D27a0\\\":{\\\"name\\\":\\\"Neutrino USD\\\",\\\"symbol\\\":\\\"USDN\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x674C6Ad92Fd080e4004b2312b45f796a192D27a0\\\",\\\"iconUrl\\\":\\\"usdn.svg\\\",\\\"occurrences\\\":null},\\\"0xE5CAeF4Af8780E59Df925470b050Fb23C43CA68C\\\":{\\\"name\\\":\\\"Ferrum Network Token\\\",\\\"symbol\\\":\\\"FRM\\\",\\\"decimals\\\":6,\\\"address\\\":\\\"0xE5CAeF4Af8780E59Df925470b050Fb23C43CA68C\\\",\\\"iconUrl\\\":\\\"frm.svg\\\",\\\"occurrences\\\":null},\\\"0x998FFE1E43fAcffb941dc337dD0468d52bA5b48A\\\":{\\\"name\\\":\\\"Rupiah Token\\\",\\\"symbol\\\":\\\"IDRT\\\",\\\"decimals\\\":2,\\\"address\\\":\\\"0x998FFE1E43fAcffb941dc337dD0468d52bA5b48A\\\",\\\"iconUrl\\\":\\\"idrt.svg\\\",\\\"occurrences\\\":null},\\\"0x4E15361FD6b4BB609Fa63C81A2be19d873717870\\\":{\\\"name\\\":\\\"Fantom\\\",\\\"symbol\\\":\\\"FTM\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x4E15361FD6b4BB609Fa63C81A2be19d873717870\\\",\\\"iconUrl\\\":\\\"ftm.svg\\\",\\\"occurrences\\\":null},\\\"0x557B933a7C2c45672B610F8954A3deB39a51A8Ca\\\":{\\\"name\\\":\\\"REVV\\\",\\\"symbol\\\":\\\"REVV\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x557B933a7C2c45672B610F8954A3deB39a51A8Ca\\\",\\\"iconUrl\\\":\\\"revv.svg\\\",\\\"occurrences\\\":null},\\\"0xFFC97d72E13E01096502Cb8Eb52dEe56f74DAD7B\\\":{\\\"name\\\":\\\"Aave AAVE\\\",\\\"symbol\\\":\\\"aAAVE\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xFFC97d72E13E01096502Cb8Eb52dEe56f74DAD7B\\\",\\\"iconUrl\\\":\\\"aAAVE.svg\\\",\\\"occurrences\\\":null},\\\"0x05Ec93c0365baAeAbF7AefFb0972ea7ECdD39CF1\\\":{\\\"name\\\":\\\"Aave BAT\\\",\\\"symbol\\\":\\\"aBAT\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x05Ec93c0365baAeAbF7AefFb0972ea7ECdD39CF1\\\",\\\"iconUrl\\\":\\\"aBAT.svg\\\",\\\"occurrences\\\":null},\\\"0xA361718326c15715591c299427c62086F69923D9\\\":{\\\"name\\\":\\\"Aave BUSD\\\",\\\"symbol\\\":\\\"aBUSD\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xA361718326c15715591c299427c62086F69923D9\\\",\\\"iconUrl\\\":\\\"aBUSD.svg\\\",\\\"occurrences\\\":null},\\\"0x028171bCA77440897B824Ca71D1c56caC55b68A3\\\":{\\\"name\\\":\\\"Aave DAI\\\",\\\"symbol\\\":\\\"aDAI\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x028171bCA77440897B824Ca71D1c56caC55b68A3\\\",\\\"iconUrl\\\":\\\"aDAI.svg\\\",\\\"occurrences\\\":null},\\\"0xaC6Df26a590F08dcC95D5a4705ae8abbc88509Ef\\\":{\\\"name\\\":\\\"Aave ENJ\\\",\\\"symbol\\\":\\\"aENJ\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xaC6Df26a590F08dcC95D5a4705ae8abbc88509Ef\\\",\\\"iconUrl\\\":\\\"aENJ.svg\\\",\\\"occurrences\\\":null},\\\"0xD37EE7e4f452C6638c96536e68090De8cBcdb583\\\":{\\\"name\\\":\\\"Aave GUSD\\\",\\\"symbol\\\":\\\"aGUSD\\\",\\\"decimals\\\":2,\\\"address\\\":\\\"0xD37EE7e4f452C6638c96536e68090De8cBcdb583\\\",\\\"iconUrl\\\":\\\"aGUSD.svg\\\",\\\"occurrences\\\":null},\\\"0x39C6b3e42d6A679d7D776778Fe880BC9487C2EDA\\\":{\\\"name\\\":\\\"Aave KNC\\\",\\\"symbol\\\":\\\"aKNC\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x39C6b3e42d6A679d7D776778Fe880BC9487C2EDA\\\",\\\"iconUrl\\\":\\\"aKNC.svg\\\",\\\"occurrences\\\":null},\\\"0xa06bC25B5805d5F8d82847D191Cb4Af5A3e873E0\\\":{\\\"name\\\":\\\"Aave LINK\\\",\\\"symbol\\\":\\\"aLINK\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xa06bC25B5805d5F8d82847D191Cb4Af5A3e873E0\\\",\\\"iconUrl\\\":\\\"aLINK.svg\\\",\\\"occurrences\\\":null},\\\"0xa685a61171bb30d4072B338c80Cb7b2c865c873E\\\":{\\\"name\\\":\\\"Aave MANA\\\",\\\"symbol\\\":\\\"aMANA\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xa685a61171bb30d4072B338c80Cb7b2c865c873E\\\",\\\"iconUrl\\\":\\\"aMANA.svg\\\",\\\"occurrences\\\":null},\\\"0xc713e5E149D5D0715DcD1c156a020976e7E56B88\\\":{\\\"name\\\":\\\"Aave MKR\\\",\\\"symbol\\\":\\\"aMKR\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xc713e5E149D5D0715DcD1c156a020976e7E56B88\\\",\\\"iconUrl\\\":\\\"aMKR.svg\\\",\\\"occurrences\\\":null},\\\"0xCC12AbE4ff81c9378D670De1b57F8e0Dd228D77a\\\":{\\\"name\\\":\\\"Aave REN\\\",\\\"symbol\\\":\\\"aREN\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xCC12AbE4ff81c9378D670De1b57F8e0Dd228D77a\\\",\\\"iconUrl\\\":\\\"aREN.svg\\\",\\\"occurrences\\\":null},\\\"0x35f6B052C598d933D69A4EEC4D04c73A191fE6c2\\\":{\\\"name\\\":\\\"Aave SNX\\\",\\\"symbol\\\":\\\"aSNX\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x35f6B052C598d933D69A4EEC4D04c73A191fE6c2\\\",\\\"iconUrl\\\":\\\"aSNX.svg\\\",\\\"occurrences\\\":null},\\\"0x6C5024Cd4F8A59110119C56f8933403A539555EB\\\":{\\\"name\\\":\\\"Aave SUSD\\\",\\\"symbol\\\":\\\"aSUSD\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x6C5024Cd4F8A59110119C56f8933403A539555EB\\\",\\\"iconUrl\\\":\\\"aSUSD.svg\\\",\\\"occurrences\\\":null},\\\"0x101cc05f4A51C0319f570d5E146a8C625198e636\\\":{\\\"name\\\":\\\"Aave TUSD\\\",\\\"symbol\\\":\\\"aTUSD\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x101cc05f4A51C0319f570d5E146a8C625198e636\\\",\\\"iconUrl\\\":\\\"aTUSD.svg\\\",\\\"occurrences\\\":null},\\\"0xB9D7CB55f463405CDfBe4E90a6D2Df01C2B92BF1\\\":{\\\"name\\\":\\\"Aave UNI\\\",\\\"symbol\\\":\\\"aUNI\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xB9D7CB55f463405CDfBe4E90a6D2Df01C2B92BF1\\\",\\\"iconUrl\\\":\\\"aUNI.svg\\\",\\\"occurrences\\\":null},\\\"0xBcca60bB61934080951369a648Fb03DF4F96263C\\\":{\\\"name\\\":\\\"Aave USDC\\\",\\\"symbol\\\":\\\"aUSDC\\\",\\\"decimals\\\":6,\\\"address\\\":\\\"0xBcca60bB61934080951369a648Fb03DF4F96263C\\\",\\\"iconUrl\\\":\\\"aUSDC.svg\\\",\\\"occurrences\\\":null},\\\"0x3Ed3B47Dd13EC9a98b44e6204A523E766B225811\\\":{\\\"name\\\":\\\"Aave USDT\\\",\\\"symbol\\\":\\\"aUSDT\\\",\\\"decimals\\\":6,\\\"address\\\":\\\"0x3Ed3B47Dd13EC9a98b44e6204A523E766B225811\\\",\\\"iconUrl\\\":\\\"aUSDT.svg\\\",\\\"occurrences\\\":null},\\\"0x9ff58f4fFB29fA2266Ab25e75e2A8b3503311656\\\":{\\\"name\\\":\\\"Aave WBTC\\\",\\\"symbol\\\":\\\"aWBTC\\\",\\\"decimals\\\":8,\\\"address\\\":\\\"0x9ff58f4fFB29fA2266Ab25e75e2A8b3503311656\\\",\\\"iconUrl\\\":\\\"aWBTC.svg\\\",\\\"occurrences\\\":null},\\\"0x030bA81f1c18d280636F32af80b9AAd02Cf0854e\\\":{\\\"name\\\":\\\"Aave WETH\\\",\\\"symbol\\\":\\\"aWETH\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x030bA81f1c18d280636F32af80b9AAd02Cf0854e\\\",\\\"iconUrl\\\":\\\"aWETH.svg\\\",\\\"occurrences\\\":null},\\\"0x5165d24277cD063F5ac44Efd447B27025e888f37\\\":{\\\"name\\\":\\\"Aave YFI\\\",\\\"symbol\\\":\\\"aYFI\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x5165d24277cD063F5ac44Efd447B27025e888f37\\\",\\\"iconUrl\\\":\\\"aYFI.svg\\\",\\\"occurrences\\\":null},\\\"0xdef1fac7Bf08f173D286BbBDcBeeADe695129840\\\":{\\\"name\\\":\\\"Defi Factory Token\\\",\\\"symbol\\\":\\\"DEFT\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xdef1fac7Bf08f173D286BbBDcBeeADe695129840\\\",\\\"iconUrl\\\":\\\"DEFT.svg\\\",\\\"occurrences\\\":null},\\\"0xDf7FF54aAcAcbFf42dfe29DD6144A69b629f8C9e\\\":{\\\"name\\\":\\\"Aave ZRX\\\",\\\"symbol\\\":\\\"aZRX\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xDf7FF54aAcAcbFf42dfe29DD6144A69b629f8C9e\\\",\\\"iconUrl\\\":\\\"aZRX.svg\\\",\\\"occurrences\\\":null},\\\"0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9\\\":{\\\"name\\\":\\\"Aave\\\",\\\"symbol\\\":\\\"AAVE\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9\\\",\\\"iconUrl\\\":\\\"AAVE.svg\\\",\\\"occurrences\\\":null},\\\"0x1Da87b114f35E1DC91F72bF57fc07A768Ad40Bb0\\\":{\\\"name\\\":\\\"Equalizer\\\",\\\"symbol\\\":\\\"EQZ\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x1Da87b114f35E1DC91F72bF57fc07A768Ad40Bb0\\\",\\\"iconUrl\\\":\\\"EQZ.svg\\\",\\\"occurrences\\\":null},\\\"0x4da27a545c0c5B758a6BA100e3a049001de870f5\\\":{\\\"name\\\":\\\"Staked Aave\\\",\\\"symbol\\\":\\\"stAAVE\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x4da27a545c0c5B758a6BA100e3a049001de870f5\\\",\\\"iconUrl\\\":\\\"stkAAVE.svg\\\",\\\"occurrences\\\":null},\\\"0xba9d4199faB4f26eFE3551D490E3821486f135Ba\\\":{\\\"name\\\":\\\"SwissBorg\\\",\\\"symbol\\\":\\\"CHSB\\\",\\\"decimals\\\":8,\\\"address\\\":\\\"0xba9d4199faB4f26eFE3551D490E3821486f135Ba\\\",\\\"iconUrl\\\":\\\"chsb.svg\\\",\\\"occurrences\\\":null},\\\"0x7DD9c5Cba05E151C895FDe1CF355C9A1D5DA6429\\\":{\\\"name\\\":\\\"Golem Network Token\\\",\\\"symbol\\\":\\\"GLM\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x7DD9c5Cba05E151C895FDe1CF355C9A1D5DA6429\\\",\\\"iconUrl\\\":\\\"glm.svg\\\",\\\"occurrences\\\":null},\\\"0x7240aC91f01233BaAf8b064248E80feaA5912BA3\\\":{\\\"name\\\":\\\"OctoFi\\\",\\\"symbol\\\":\\\"OCTO\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x7240aC91f01233BaAf8b064248E80feaA5912BA3\\\",\\\"iconUrl\\\":\\\"octo.svg\\\",\\\"occurrences\\\":null},\\\"0xff56Cc6b1E6dEd347aA0B7676C85AB0B3D08B0FA\\\":{\\\"name\\\":\\\"Orbs\\\",\\\"symbol\\\":\\\"ORBS\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xff56Cc6b1E6dEd347aA0B7676C85AB0B3D08B0FA\\\",\\\"iconUrl\\\":\\\"orbs.svg\\\",\\\"occurrences\\\":null},\\\"0x63f88A2298a5c4AEE3c216Aa6D926B184a4b2437\\\":{\\\"name\\\":\\\"GAME Credits\\\",\\\"symbol\\\":\\\"GAME\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x63f88A2298a5c4AEE3c216Aa6D926B184a4b2437\\\",\\\"iconUrl\\\":\\\"GAMECreditsLogo.svg\\\",\\\"occurrences\\\":null},\\\"0x5150956E082C748Ca837a5dFa0a7C10CA4697f9c\\\":{\\\"name\\\":\\\"Zeedex\\\",\\\"symbol\\\":\\\"ZDEX\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x5150956E082C748Ca837a5dFa0a7C10CA4697f9c\\\",\\\"iconUrl\\\":\\\"zdex.svg\\\",\\\"occurrences\\\":null},\\\"0x84cA8bc7997272c7CfB4D0Cd3D55cd942B3c9419\\\":{\\\"name\\\":\\\"DIAdata\\\",\\\"symbol\\\":\\\"DIA\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x84cA8bc7997272c7CfB4D0Cd3D55cd942B3c9419\\\",\\\"iconUrl\\\":\\\"dia.svg\\\",\\\"occurrences\\\":null},\\\"0xb78B3320493a4EFaa1028130C5Ba26f0B6085Ef8\\\":{\\\"name\\\":\\\"Dracula\\\",\\\"symbol\\\":\\\"DRC\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xb78B3320493a4EFaa1028130C5Ba26f0B6085Ef8\\\",\\\"iconUrl\\\":\\\"dracula.svg\\\",\\\"occurrences\\\":null},\\\"0xF433089366899D83a9f26A773D59ec7eCF30355e\\\":{\\\"name\\\":\\\"Metal\\\",\\\"symbol\\\":\\\"MTL\\\",\\\"decimals\\\":8,\\\"address\\\":\\\"0xF433089366899D83a9f26A773D59ec7eCF30355e\\\",\\\"iconUrl\\\":\\\"mtl.svg\\\",\\\"occurrences\\\":null},\\\"0x85Eee30c52B0b379b046Fb0F85F4f3Dc3009aFEC\\\":{\\\"name\\\":\\\"KEEP\\\",\\\"symbol\\\":\\\"KEEP\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x85Eee30c52B0b379b046Fb0F85F4f3Dc3009aFEC\\\",\\\"iconUrl\\\":\\\"keep.svg\\\",\\\"occurrences\\\":null},\\\"0x8dAEBADE922dF735c38C80C7eBD708Af50815fAa\\\":{\\\"name\\\":\\\"tBTC\\\",\\\"symbol\\\":\\\"TBTC\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x8dAEBADE922dF735c38C80C7eBD708Af50815fAa\\\",\\\"iconUrl\\\":\\\"tbtc.svg\\\",\\\"occurrences\\\":null},\\\"0xD7EFB00d12C2c13131FD319336Fdf952525dA2af\\\":{\\\"name\\\":\\\"Proton\\\",\\\"symbol\\\":\\\"XPR\\\",\\\"decimals\\\":4,\\\"address\\\":\\\"0xD7EFB00d12C2c13131FD319336Fdf952525dA2af\\\",\\\"iconUrl\\\":\\\"proton.svg\\\",\\\"occurrences\\\":null},\\\"0x178c820f862B14f316509ec36b13123DA19A6054\\\":{\\\"name\\\":\\\"Energy Web Token Bridged\\\",\\\"symbol\\\":\\\"EWTB\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x178c820f862B14f316509ec36b13123DA19A6054\\\",\\\"iconUrl\\\":\\\"ewtb.svg\\\",\\\"occurrences\\\":null},\\\"0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39\\\":{\\\"name\\\":\\\"HEX\\\",\\\"symbol\\\":\\\"HEX\\\",\\\"decimals\\\":8,\\\"address\\\":\\\"0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39\\\",\\\"iconUrl\\\":\\\"hex.svg\\\",\\\"occurrences\\\":null},\\\"0xFca59Cd816aB1eaD66534D82bc21E7515cE441CF\\\":{\\\"name\\\":\\\"Rarible\\\",\\\"symbol\\\":\\\"RARI\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0xFca59Cd816aB1eaD66534D82bc21E7515cE441CF\\\",\\\"iconUrl\\\":\\\"rari.svg\\\",\\\"occurrences\\\":null},\\\"0x7865af71cf0b288b4E7F654f4F7851EB46a2B7F8\\\":{\\\"name\\\":\\\"Sentivate\\\",\\\"symbol\\\":\\\"SNTVT\\\",\\\"decimals\\\":18,\\\"address\\\":\\\"0x7865af71cf0b288b4E7F654f4F7851EB46a2B7F8\\\",\\\"iconUrl\\\":\\\"sentivate.svg\\\",\\\"occurrences\\\":null},\\\"0xa3d58c4E56fedCae3a7c43A725aeE9A71F0ece4e\\\":{\\";
	String smallText = "{}";

	public void testWriteFileSmall() throws InterruptedException {
		CountDownLatch latch = new CountDownLatch(1);

		RNFetchBlobFS.writeFile("/data/user/0/io.metamask/files/test", RNFB_RESPONSE_UTF8, smallText, false, new Promise() {
			@Override
			public void resolve(@Nullable Object value) {
				assertTrue(true);
			}

			@Override
			public void reject(String code, String message) {
				fail();
			}

			@Override
			public void reject(String code, Throwable throwable) {
				fail();

			}

			@Override
			public void reject(String code, String message, Throwable throwable) {
				fail();

			}

			@Override
			public void reject(Throwable throwable) {
				fail();

			}

			@Override
			public void reject(Throwable throwable, WritableMap userInfo) {
				fail();

			}

			@Override
			public void reject(String code, @NonNull WritableMap userInfo) {
				fail();

			}

			@Override
			public void reject(String code, Throwable throwable, WritableMap userInfo) {
				fail();

			}

			@Override
			public void reject(String code, String message, @NonNull WritableMap userInfo) {
				fail();

			}

			@Override
			public void reject(String code, String message, Throwable throwable, WritableMap userInfo) {
				fail();

			}

			@Override
			public void reject(String message) {
				fail();

			}
		});

		RNFetchBlobFS.readFile("/data/user/0/io.metamask/files/test", RNFB_RESPONSE_UTF8, new Promise() {
			@Override
			public void resolve(@Nullable Object value) {
				assertTrue(smallText.equals(value));
				latch.countDown();
			}

			@Override
			public void reject(String code, String message) {

			}

			@Override
			public void reject(String code, Throwable throwable) {

			}

			@Override
			public void reject(String code, String message, Throwable throwable) {

			}

			@Override
			public void reject(Throwable throwable) {

			}

			@Override
			public void reject(Throwable throwable, WritableMap userInfo) {

			}

			@Override
			public void reject(String code, @NonNull WritableMap userInfo) {

			}

			@Override
			public void reject(String code, Throwable throwable, WritableMap userInfo) {

			}

			@Override
			public void reject(String code, String message, @NonNull WritableMap userInfo) {

			}

			@Override
			public void reject(String code, String message, Throwable throwable, WritableMap userInfo) {

			}

			@Override
			public void reject(String message) {

			}
		});

		latch.await(10, TimeUnit.SECONDS);
	}


	public void testWriteFileLarge() throws InterruptedException {

		CountDownLatch latch = new CountDownLatch(1);

		RNFetchBlobFS.writeFile("/data/user/0/io.metamask/files/test", RNFB_RESPONSE_UTF8, testPersist, false, new Promise() {
			@Override
			public void resolve(@Nullable Object value) {
				assertTrue(true);
			}

			@Override
			public void reject(String code, String message) {
				fail();
			}

			@Override
			public void reject(String code, Throwable throwable) {
				fail();

			}

			@Override
			public void reject(String code, String message, Throwable throwable) {
				fail();

			}

			@Override
			public void reject(Throwable throwable) {
				fail();

			}

			@Override
			public void reject(Throwable throwable, WritableMap userInfo) {
				fail();

			}

			@Override
			public void reject(String code, @NonNull WritableMap userInfo) {
				fail();

			}

			@Override
			public void reject(String code, Throwable throwable, WritableMap userInfo) {
				fail();

			}

			@Override
			public void reject(String code, String message, @NonNull WritableMap userInfo) {
				fail();

			}

			@Override
			public void reject(String code, String message, Throwable throwable, WritableMap userInfo) {
				fail();

			}

			@Override
			public void reject(String message) {
				fail();

			}
		});

		RNFetchBlobFS.readFile("/data/user/0/io.metamask/files/test", RNFB_RESPONSE_UTF8, new Promise() {
			@Override
			public void resolve(@Nullable Object value) {
				assertTrue(testPersist.equals(value));
				latch.countDown();
			}

			@Override
			public void reject(String code, String message) {

			}

			@Override
			public void reject(String code, Throwable throwable) {

			}

			@Override
			public void reject(String code, String message, Throwable throwable) {

			}

			@Override
			public void reject(Throwable throwable) {

			}

			@Override
			public void reject(Throwable throwable, WritableMap userInfo) {

			}

			@Override
			public void reject(String code, @NonNull WritableMap userInfo) {

			}

			@Override
			public void reject(String code, Throwable throwable, WritableMap userInfo) {

			}

			@Override
			public void reject(String code, String message, @NonNull WritableMap userInfo) {

			}

			@Override
			public void reject(String code, String message, Throwable throwable, WritableMap userInfo) {

			}

			@Override
			public void reject(String message) {

			}
		});

		latch.await(10, TimeUnit.SECONDS);
	}

}
