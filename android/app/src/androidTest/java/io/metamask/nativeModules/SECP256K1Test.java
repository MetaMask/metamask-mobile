package io.metamask.nativeModules;

import android.content.BroadcastReceiver;
import android.content.ComponentCallbacks;
import android.content.ComponentName;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.IntentSender;
import android.content.ServiceConnection;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.res.AssetManager;
import android.content.res.Configuration;
import android.content.res.Resources;
import android.database.DatabaseErrorHandler;
import android.database.sqlite.SQLiteDatabase;
import android.graphics.Bitmap;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.UserHandle;
import android.view.Display;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableArray;

import junit.framework.TestCase;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.InvalidKeyException;
import java.util.concurrent.Executor;

public class SECP256K1Test extends TestCase {

	SECP256K1 test;

	public void setUp (){
		test = new SECP256K1(new mockReactContext(new mockContext()));
	}

	public void testMetaMaskMobileSuccessfulGetPoint() throws Exception {
		//MM Private Key 0
		WritableArray pointValues = test.getPoint("c2ef448dd6bbb0eb81fb74ce89e218da4acb7f258c1899233c5b2962de0b09ed");
		assertEquals("X Coordinate", "9ee354bf351314f4bf28d2ba5ad99c99f55c3da5d6e84f84cb9a76d2666d5f9b", pointValues.getString(0));
		assertEquals("Y Coordinate", "34b02f368de97272048ffb0dcb53067bdb77bd1cc46cd384dd430d856aaf59a3", pointValues.getString(1));

		pointValues = test.getPoint("c2ef448dd6bbb0eb81fb74ce89e218da4acb7f258c1899233c5b2962de0b09ed".toUpperCase());
		assertEquals("X Coordinate", "9ee354bf351314f4bf28d2ba5ad99c99f55c3da5d6e84f84cb9a76d2666d5f9b", pointValues.getString(0));
		assertEquals("Y Coordinate", "34b02f368de97272048ffb0dcb53067bdb77bd1cc46cd384dd430d856aaf59a3", pointValues.getString(1));

		//MM Private Key 1
		pointValues = test.getPoint("bce8be7587c4773d4dc3e69416d2f065f2f929fe42acfb8d74c59cfbb1c7a165");
		assertEquals("X Coordinate", "882f1fe35041fc769faeacb0731a309a8135c15eb5b37aa81489a467196d463b", pointValues.getString(0));
		assertEquals("Y Coordinate", "214578c4cbe09932a82c92e9e4fd51f84e3bdbb792dd051054b50e9d4cfb9925", pointValues.getString(1));

		pointValues = test.getPoint("bce8be7587c4773d4dc3e69416d2f065f2f929fe42acfb8d74c59cfbb1c7a165".toUpperCase());
		assertEquals("X Coordinate", "882f1fe35041fc769faeacb0731a309a8135c15eb5b37aa81489a467196d463b", pointValues.getString(0));
		assertEquals("Y Coordinate", "214578c4cbe09932a82c92e9e4fd51f84e3bdbb792dd051054b50e9d4cfb9925", pointValues.getString(1));

		//MM Private Key 2
		pointValues = test.getPoint("ad95d9b9e22dc2fed21a921fb24bc3aea3fed718c24377994fe3d8c6ecff7aeb");
		assertEquals("X Coordinate", "48ebe2e313de2b474ae549150f11fc8bed7d64ade4d9d97fe313fbf9be33733f", pointValues.getString(0));
		assertEquals("Y Coordinate", "533609c203d1d4939ce69564d1cba87126ac1fa777ac9ddebfdbfb16b6a75c0b", pointValues.getString(1));

		pointValues = test.getPoint("ad95d9b9e22dc2fed21a921fb24bc3aea3fed718c24377994fe3d8c6ecff7aeb");
		assertEquals("X Coordinate", "48ebe2e313de2b474ae549150f11fc8bed7d64ade4d9d97fe313fbf9be33733f", pointValues.getString(0));
		assertEquals("Y Coordinate", "533609c203d1d4939ce69564d1cba87126ac1fa777ac9ddebfdbfb16b6a75c0b", pointValues.getString(1));
	}

	public void testSECP256K1GeneratedSuccessfulGetPoint () throws Exception {
		// https://chuckbatson.wordpress.com/2014/11/26/secp256k1-test-vectors/
		//Curve: secp256k1

		WritableArray pointValues = test.getPoint("0000000000000000000000000000000000000000000000000000000000000001");
		assertEquals("X Coordinate", "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798", pointValues.getString(0));
		assertEquals("Y Coordinate", "483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8", pointValues.getString(1));

		pointValues = test.getPoint("0000000000000000000000000000000000000000000000000000000000000014");
		assertEquals("X Coordinate", "4ce119c96e2fa357200b559b2f7dd5a5f02d5290aff74b03f3e471b273211c97", pointValues.getString(0));
		assertEquals("Y Coordinate", "12ba26dcb10ec1625da61fa10a844c676162948271d96967450288ee9233dc3a", pointValues.getString(1));

		pointValues = test.getPoint("00000000000000000000000000000000000000000000000000000000000000A0");
		assertEquals("X Coordinate", "308913a27a52d9222bc776838f73f576a4d047122a9b184b05ec32ad51b03f6c", pointValues.getString(0));
		assertEquals("Y Coordinate", "f4a5b09543febe5f91e3531f66c0375da8333fea82bd1f1260ab5efce8fe4c67", pointValues.getString(1));
	}

	public void testMetaMaskExtensionGetPoint () throws Exception {
		WritableArray pointValues = test.getPoint("00000000000000000000000000000000000000000000000000000000000000A0");
		assertEquals("X Coordinate", "308913a27a52d9222bc776838f73f576a4d047122a9b184b05ec32ad51b03f6c", pointValues.getString(0));
		assertEquals("Y Coordinate", "f4a5b09543febe5f91e3531f66c0375da8333fea82bd1f1260ab5efce8fe4c67", pointValues.getString(1));
	}

	public void testWrongPublicPointsGetPoint() throws Exception {
		//Keys don't match
		WritableArray pointValues = test.getPoint("ad95d9b9e22dc2fed21a921fb24bc3aea3fed718c24377994fe3d8c6ecff7000");
		assertNotSame("X Coordinate", "48ebe2e313de2b474ae549150f11fc8bed7d64ade4d9d97fe313fbf9be33733f", pointValues.getString(0));
		assertNotSame("Y Coordinate", "533609c203d1d4939ce69564d1cba87126ac1fa777ac9ddebfdbfb16b6a75c0b", pointValues.getString(1));
	}

	public void testInvalidKeyGetPoint() throws Exception {
		try {
			WritableArray pointValues = test.getPoint("ad95d9b9e22dc2fed21a921fb2");
		} catch (InvalidKeyException e) {
			assertNotNull(e);
			return;
		}

		fail();

	}

	public void testCorrectPublicKey() throws Exception {
		//Uncompressed Key
		String publicKey = test.publicKeyCreate("c2ef448dd6bbb0eb81fb74ce89e218da4acb7f258c1899233c5b2962de0b09ed", false);
		assertEquals("49ee354bf351314f4bf28d2ba5ad99c99f55c3da5d6e84f84cb9a76d2666d5f9b34b02f368de97272048ffb0dcb53067bdb77bd1cc46cd384dd430d856aaf59a3", publicKey);

		//Compressed Key
		publicKey = test.publicKeyCreate("c2ef448dd6bbb0eb81fb74ce89e218da4acb7f258c1899233c5b2962de0b09ed", true);
		assertEquals("39ee354bf351314f4bf28d2ba5ad99c99f55c3da5d6e84f84cb9a76d2666d5f9b", publicKey);
	}

	public void testWrongPublicKey() throws Exception {
		//Keys don't match
		String publicKey = test.publicKeyCreate("ad95d9b9e22dc2fed21a921fb24bc3aea3fed718c24377994fe3d8c6ecff7000", false);
		assertFalse(publicKey.contains("48ebe2e313de2b474ae549150f11fc8bed7d64ade4d9d97fe313fbf9be33733f"));
		assertFalse(publicKey.contains("533609c203d1d4939ce69564d1cba87126ac1fa777ac9ddebfdbfb16b6a75c0b"));
	}

	public void testInvalidKeyPublicKey() throws Exception {
		try {
			String publicKey = test.publicKeyCreate("ad95d9b9e22dc2fed21a921fb2", false);
		} catch (InvalidKeyException e) {
			assertNotNull(e);
			return;
		}

		fail();
	}
}

// https://chuckbatson.wordpress.com/2014/11/26/secp256k1-test-vectors/
//Curve: secp256k1
//	-------------
//	k = 1
//	x = 79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798
//	y = 483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8
//
//	k = 2
//	x = C6047F9441ED7D6D3045406E95C07CD85C778E4B8CEF3CA7ABAC09B95C709EE5
//	y = 1AE168FEA63DC339A3C58419466CEAEEF7F632653266D0E1236431A950CFE52A
//
//	k = 3
//	x = F9308A019258C31049344F85F89D5229B531C845836F99B08601F113BCE036F9
//	y = 388F7B0F632DE8140FE337E62A37F3566500A99934C2231B6CB9FD7584B8E672
//
//	k = 4
//	x = E493DBF1C10D80F3581E4904930B1404CC6C13900EE0758474FA94ABE8C4CD13
//	y = 51ED993EA0D455B75642E2098EA51448D967AE33BFBDFE40CFE97BDC47739922
//
//	k = 5
//	x = 2F8BDE4D1A07209355B4A7250A5C5128E88B84BDDC619AB7CBA8D569B240EFE4
//	y = D8AC222636E5E3D6D4DBA9DDA6C9C426F788271BAB0D6840DCA87D3AA6AC62D6
//
//	k = 6
//	x = FFF97BD5755EEEA420453A14355235D382F6472F8568A18B2F057A1460297556
//	y = AE12777AACFBB620F3BE96017F45C560DE80F0F6518FE4A03C870C36B075F297
//
//	k = 7
//	x = 5CBDF0646E5DB4EAA398F365F2EA7A0E3D419B7E0330E39CE92BDDEDCAC4F9BC
//	y = 6AEBCA40BA255960A3178D6D861A54DBA813D0B813FDE7B5A5082628087264DA
//
//	k = 8
//	x = 2F01E5E15CCA351DAFF3843FB70F3C2F0A1BDD05E5AF888A67784EF3E10A2A01
//	y = 5C4DA8A741539949293D082A132D13B4C2E213D6BA5B7617B5DA2CB76CBDE904
//
//	k = 9
//	x = ACD484E2F0C7F65309AD178A9F559ABDE09796974C57E714C35F110DFC27CCBE
//	y = CC338921B0A7D9FD64380971763B61E9ADD888A4375F8E0F05CC262AC64F9C37
//
//	k = 10
//	x = A0434D9E47F3C86235477C7B1AE6AE5D3442D49B1943C2B752A68E2A47E247C7
//	y = 893ABA425419BC27A3B6C7E693A24C696F794C2ED877A1593CBEE53B037368D7
//
//	k = 11
//	x = 774AE7F858A9411E5EF4246B70C65AAC5649980BE5C17891BBEC17895DA008CB
//	y = D984A032EB6B5E190243DD56D7B7B365372DB1E2DFF9D6A8301D74C9C953C61B
//
//	k = 12
//	x = D01115D548E7561B15C38F004D734633687CF4419620095BC5B0F47070AFE85A
//	y = A9F34FFDC815E0D7A8B64537E17BD81579238C5DD9A86D526B051B13F4062327
//
//	k = 13
//	x = F28773C2D975288BC7D1D205C3748651B075FBC6610E58CDDEEDDF8F19405AA8
//	y = 0AB0902E8D880A89758212EB65CDAF473A1A06DA521FA91F29B5CB52DB03ED81
//
//	k = 14
//	x = 499FDF9E895E719CFD64E67F07D38E3226AA7B63678949E6E49B241A60E823E4
//	y = CAC2F6C4B54E855190F044E4A7B3D464464279C27A3F95BCC65F40D403A13F5B
//
//	k = 15
//	x = D7924D4F7D43EA965A465AE3095FF41131E5946F3C85F79E44ADBCF8E27E080E
//	y = 581E2872A86C72A683842EC228CC6DEFEA40AF2BD896D3A5C504DC9FF6A26B58
//
//	k = 16
//	x = E60FCE93B59E9EC53011AABC21C23E97B2A31369B87A5AE9C44EE89E2A6DEC0A
//	y = F7E3507399E595929DB99F34F57937101296891E44D23F0BE1F32CCE69616821
//
//	k = 17
//	x = DEFDEA4CDB677750A420FEE807EACF21EB9898AE79B9768766E4FAA04A2D4A34
//	y = 4211AB0694635168E997B0EAD2A93DAECED1F4A04A95C0F6CFB199F69E56EB77
//
//	k = 18
//	x = 5601570CB47F238D2B0286DB4A990FA0F3BA28D1A319F5E7CF55C2A2444DA7CC
//	y = C136C1DC0CBEB930E9E298043589351D81D8E0BC736AE2A1F5192E5E8B061D58
//
//	k = 19
//	x = 2B4EA0A797A443D293EF5CFF444F4979F06ACFEBD7E86D277475656138385B6C
//	y = 85E89BC037945D93B343083B5A1C86131A01F60C50269763B570C854E5C09B7A
//
//	k = 20
//	x = 4CE119C96E2FA357200B559B2F7DD5A5F02D5290AFF74B03F3E471B273211C97
//	y = 12BA26DCB10EC1625DA61FA10A844C676162948271D96967450288EE9233DC3A
//
//	k = 112233445566778899
//	x = A90CC3D3F3E146DAADFC74CA1372207CB4B725AE708CEF713A98EDD73D99EF29
//	y = 5A79D6B289610C68BC3B47F3D72F9788A26A06868B4D8E433E1E2AD76FB7DC76
//
//	k = 112233445566778899112233445566778899
//	x = E5A2636BCFD412EBF36EC45B19BFB68A1BC5F8632E678132B885F7DF99C5E9B3
//	y = 736C1CE161AE27B405CAFD2A7520370153C2C861AC51D6C1D5985D9606B45F39
//
//	k = 28948022309329048855892746252171976963209391069768726095651290785379540373584
//	x = A6B594B38FB3E77C6EDF78161FADE2041F4E09FD8497DB776E546C41567FEB3C
//	y = 71444009192228730CD8237A490FEBA2AFE3D27D7CC1136BC97E439D13330D55
//
//	k = 57896044618658097711785492504343953926418782139537452191302581570759080747168
//	x = 00000000000000000000003B78CE563F89A0ED9414F5AA28AD0D96D6795F9C63
//	y = 3F3979BF72AE8202983DC989AEC7F2FF2ED91BDD69CE02FC0700CA100E59DDF3
//
//	k = 86844066927987146567678238756515930889628173209306178286953872356138621120752
//	x = E24CE4BEEE294AA6350FAA67512B99D388693AE4E7F53D19882A6EA169FC1CE1
//	y = 8B71E83545FC2B5872589F99D948C03108D36797C4DE363EBD3FF6A9E1A95B10
//
//	k = 115792089237316195423570985008687907852837564279074904382605163141518161494317
//	x = 4CE119C96E2FA357200B559B2F7DD5A5F02D5290AFF74B03F3E471B273211C97
//	y = ED45D9234EF13E9DA259E05EF57BB3989E9D6B7D8E269698BAFD77106DCC1FF5
//
//	k = 115792089237316195423570985008687907852837564279074904382605163141518161494318
//	x = 2B4EA0A797A443D293EF5CFF444F4979F06ACFEBD7E86D277475656138385B6C
//	y = 7A17643FC86BA26C4CBCF7C4A5E379ECE5FE09F3AFD9689C4A8F37AA1A3F60B5
//
//	k = 115792089237316195423570985008687907852837564279074904382605163141518161494319
//	x = 5601570CB47F238D2B0286DB4A990FA0F3BA28D1A319F5E7CF55C2A2444DA7CC
//	y = 3EC93E23F34146CF161D67FBCA76CAE27E271F438C951D5E0AE6D1A074F9DED7
//
//	k = 115792089237316195423570985008687907852837564279074904382605163141518161494320
//	x = DEFDEA4CDB677750A420FEE807EACF21EB9898AE79B9768766E4FAA04A2D4A34
//	y = BDEE54F96B9CAE9716684F152D56C251312E0B5FB56A3F09304E660861A910B8
//
//	k = 115792089237316195423570985008687907852837564279074904382605163141518161494321
//	x = E60FCE93B59E9EC53011AABC21C23E97B2A31369B87A5AE9C44EE89E2A6DEC0A
//	y = 081CAF8C661A6A6D624660CB0A86C8EFED6976E1BB2DC0F41E0CD330969E940E
//
//	k = 115792089237316195423570985008687907852837564279074904382605163141518161494322
//	x = D7924D4F7D43EA965A465AE3095FF41131E5946F3C85F79E44ADBCF8E27E080E
//	y = A7E1D78D57938D597C7BD13DD733921015BF50D427692C5A3AFB235F095D90D7
//
//	k = 115792089237316195423570985008687907852837564279074904382605163141518161494323
//	x = 499FDF9E895E719CFD64E67F07D38E3226AA7B63678949E6E49B241A60E823E4
//	y = 353D093B4AB17AAE6F0FBB1B584C2B9BB9BD863D85C06A4339A0BF2AFC5EBCD4
//
//	k = 115792089237316195423570985008687907852837564279074904382605163141518161494324
//	x = F28773C2D975288BC7D1D205C3748651B075FBC6610E58CDDEEDDF8F19405AA8
//	y = F54F6FD17277F5768A7DED149A3250B8C5E5F925ADE056E0D64A34AC24FC0EAE
//
//	k = 115792089237316195423570985008687907852837564279074904382605163141518161494325
//	x = D01115D548E7561B15C38F004D734633687CF4419620095BC5B0F47070AFE85A
//	y = 560CB00237EA1F285749BAC81E8427EA86DC73A2265792AD94FAE4EB0BF9D908
//
//	k = 115792089237316195423570985008687907852837564279074904382605163141518161494326
//	x = 774AE7F858A9411E5EF4246B70C65AAC5649980BE5C17891BBEC17895DA008CB
//	y = 267B5FCD1494A1E6FDBC22A928484C9AC8D24E1D20062957CFE28B3536AC3614
//
//	k = 115792089237316195423570985008687907852837564279074904382605163141518161494327
//	x = A0434D9E47F3C86235477C7B1AE6AE5D3442D49B1943C2B752A68E2A47E247C7
//	y = 76C545BDABE643D85C4938196C5DB3969086B3D127885EA6C3411AC3FC8C9358
//
//	k = 115792089237316195423570985008687907852837564279074904382605163141518161494328
//	x = ACD484E2F0C7F65309AD178A9F559ABDE09796974C57E714C35F110DFC27CCBE
//	y = 33CC76DE4F5826029BC7F68E89C49E165227775BC8A071F0FA33D9D439B05FF8
//
//	k = 115792089237316195423570985008687907852837564279074904382605163141518161494329
//	x = 2F01E5E15CCA351DAFF3843FB70F3C2F0A1BDD05E5AF888A67784EF3E10A2A01
//	y = A3B25758BEAC66B6D6C2F7D5ECD2EC4B3D1DEC2945A489E84A25D3479342132B
//
//	k = 115792089237316195423570985008687907852837564279074904382605163141518161494330
//	x = 5CBDF0646E5DB4EAA398F365F2EA7A0E3D419B7E0330E39CE92BDDEDCAC4F9BC
//	y = 951435BF45DAA69F5CE8729279E5AB2457EC2F47EC02184A5AF7D9D6F78D9755
//
//	k = 115792089237316195423570985008687907852837564279074904382605163141518161494331
//	x = FFF97BD5755EEEA420453A14355235D382F6472F8568A18B2F057A1460297556
//	y = 51ED8885530449DF0C4169FE80BA3A9F217F0F09AE701B5FC378F3C84F8A0998
//
//	k = 115792089237316195423570985008687907852837564279074904382605163141518161494332
//	x = 2F8BDE4D1A07209355B4A7250A5C5128E88B84BDDC619AB7CBA8D569B240EFE4
//	y = 2753DDD9C91A1C292B24562259363BD90877D8E454F297BF235782C459539959
//
//	k = 115792089237316195423570985008687907852837564279074904382605163141518161494333
//	x = E493DBF1C10D80F3581E4904930B1404CC6C13900EE0758474FA94ABE8C4CD13
//	y = AE1266C15F2BAA48A9BD1DF6715AEBB7269851CC404201BF30168422B88C630D
//
//	k = 115792089237316195423570985008687907852837564279074904382605163141518161494334
//	x = F9308A019258C31049344F85F89D5229B531C845836F99B08601F113BCE036F9
//	y = C77084F09CD217EBF01CC819D5C80CA99AFF5666CB3DDCE4934602897B4715BD
//
//	k = 115792089237316195423570985008687907852837564279074904382605163141518161494335
//	x = C6047F9441ED7D6D3045406E95C07CD85C778E4B8CEF3CA7ABAC09B95C709EE5
//	y = E51E970159C23CC65C3A7BE6B99315110809CD9ACD992F1EDC9BCE55AF301705
//
//	k = 115792089237316195423570985008687907852837564279074904382605163141518161494336
//	x = 79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798
//	y = B7C52588D95C3B9AA25B0403F1EEF75702E84BB7597AABE663B82F6F04EF2777

class mockReactContext extends ReactApplicationContext {
	public mockReactContext(Context context) {
		super(context);
	}
}

class mockContext extends Context {
	public mockContext() {
		super();
	}

	@Override
	public Executor getMainExecutor() {
		return super.getMainExecutor();
	}

	@Override
	public void registerComponentCallbacks(ComponentCallbacks callback) {
		super.registerComponentCallbacks(callback);
	}

	@Override
	public void unregisterComponentCallbacks(ComponentCallbacks callback) {
		super.unregisterComponentCallbacks(callback);
	}

	@Override
	public String getOpPackageName() {
		return super.getOpPackageName();
	}

	@Override
	public String getAttributionTag() {
		return super.getAttributionTag();
	}

	@Override
	public void sendBroadcastWithMultiplePermissions( Intent intent,  String[] receiverPermissions) {
		super.sendBroadcastWithMultiplePermissions(intent, receiverPermissions);
	}

	@Override
	public void sendOrderedBroadcast( Intent intent,  String receiverPermission,  String receiverAppOp,  BroadcastReceiver resultReceiver,  Handler scheduler, int initialCode,  String initialData,  Bundle initialExtras) {
		super.sendOrderedBroadcast(intent, receiverPermission, receiverAppOp, resultReceiver, scheduler, initialCode, initialData, initialExtras);
	}

	@Override
	public boolean bindService( Intent service, int flags,  Executor executor,  ServiceConnection conn) {
		return super.bindService(service, flags, executor, conn);
	}

	@Override
	public boolean bindIsolatedService( Intent service, int flags,  String instanceName,  Executor executor,  ServiceConnection conn) {
		return super.bindIsolatedService(service, flags, instanceName, executor, conn);
	}

	@Override
	public boolean bindServiceAsUser( Intent service,  ServiceConnection conn, int flags,  UserHandle user) {
		return super.bindServiceAsUser(service, conn, flags, user);
	}

	@Override
	public void updateServiceGroup( ServiceConnection conn, int group, int importance) {
		super.updateServiceGroup(conn, group, importance);
	}


	@Override
	public Context createWindowContext(int type,  Bundle options) {
		return super.createWindowContext(type, options);
	}


	@Override
	public Context createAttributionContext( String attributionTag) {
		return super.createAttributionContext(attributionTag);
	}


	@Override
	public Display getDisplay() {
		return super.getDisplay();
	}

	@Override
	public boolean isRestricted() {
		return super.isRestricted();
	}

	@Override
	public AssetManager getAssets() {
		return null;
	}

	@Override
	public Resources getResources() {
		return null;
	}

	@Override
	public PackageManager getPackageManager() {
		return null;
	}

	@Override
	public ContentResolver getContentResolver() {
		return null;
	}

	@Override
	public Looper getMainLooper() {
		return null;
	}

	@Override
	public Context getApplicationContext() {
		return null;
	}

	@Override
	public void setTheme(int resid) {

	}

	@Override
	public Resources.Theme getTheme() {
		return null;
	}

	@Override
	public ClassLoader getClassLoader() {
		return null;
	}

	@Override
	public String getPackageName() {
		return null;
	}

	@Override
	public ApplicationInfo getApplicationInfo() {
		return null;
	}

	@Override
	public String getPackageResourcePath() {
		return null;
	}

	@Override
	public String getPackageCodePath() {
		return null;
	}

	@Override
	public SharedPreferences getSharedPreferences(String name, int mode) {
		return null;
	}

	@Override
	public boolean moveSharedPreferencesFrom(Context sourceContext, String name) {
		return false;
	}

	@Override
	public boolean deleteSharedPreferences(String name) {
		return false;
	}

	@Override
	public FileInputStream openFileInput(String name) throws FileNotFoundException {
		return null;
	}

	@Override
	public FileOutputStream openFileOutput(String name, int mode) throws FileNotFoundException {
		return null;
	}

	@Override
	public boolean deleteFile(String name) {
		return false;
	}

	@Override
	public File getFileStreamPath(String name) {
		return null;
	}

	@Override
	public File getDataDir() {
		return null;
	}

	@Override
	public File getFilesDir() {
		return null;
	}

	@Override
	public File getNoBackupFilesDir() {
		return null;
	}


	@Override
	public File getExternalFilesDir( String type) {
		return null;
	}

	@Override
	public File[] getExternalFilesDirs(String type) {
		return new File[0];
	}

	@Override
	public File getObbDir() {
		return null;
	}

	@Override
	public File[] getObbDirs() {
		return new File[0];
	}

	@Override
	public File getCacheDir() {
		return null;
	}

	@Override
	public File getCodeCacheDir() {
		return null;
	}


	@Override
	public File getExternalCacheDir() {
		return null;
	}

	@Override
	public File[] getExternalCacheDirs() {
		return new File[0];
	}

	@Override
	public File[] getExternalMediaDirs() {
		return new File[0];
	}

	@Override
	public String[] fileList() {
		return new String[0];
	}

	@Override
	public File getDir(String name, int mode) {
		return null;
	}

	@Override
	public SQLiteDatabase openOrCreateDatabase(String name, int mode, SQLiteDatabase.CursorFactory factory) {
		return null;
	}

	@Override
	public SQLiteDatabase openOrCreateDatabase(String name, int mode, SQLiteDatabase.CursorFactory factory,  DatabaseErrorHandler errorHandler) {
		return null;
	}

	@Override
	public boolean moveDatabaseFrom(Context sourceContext, String name) {
		return false;
	}

	@Override
	public boolean deleteDatabase(String name) {
		return false;
	}

	@Override
	public File getDatabasePath(String name) {
		return null;
	}

	@Override
	public String[] databaseList() {
		return new String[0];
	}

	@Override
	public Drawable getWallpaper() {
		return null;
	}

	@Override
	public Drawable peekWallpaper() {
		return null;
	}

	@Override
	public int getWallpaperDesiredMinimumWidth() {
		return 0;
	}

	@Override
	public int getWallpaperDesiredMinimumHeight() {
		return 0;
	}

	@Override
	public void setWallpaper(Bitmap bitmap) throws IOException {

	}

	@Override
	public void setWallpaper(InputStream data) throws IOException {

	}

	@Override
	public void clearWallpaper() throws IOException {

	}

	@Override
	public void startActivity(Intent intent) {

	}

	@Override
	public void startActivity(Intent intent,  Bundle options) {

	}

	@Override
	public void startActivities(Intent[] intents) {

	}

	@Override
	public void startActivities(Intent[] intents, Bundle options) {

	}

	@Override
	public void startIntentSender(IntentSender intent,  Intent fillInIntent, int flagsMask, int flagsValues, int extraFlags) throws IntentSender.SendIntentException {

	}

	@Override
	public void startIntentSender(IntentSender intent,  Intent fillInIntent, int flagsMask, int flagsValues, int extraFlags,  Bundle options) throws IntentSender.SendIntentException {

	}

	@Override
	public void sendBroadcast(Intent intent) {

	}

	@Override
	public void sendBroadcast(Intent intent,  String receiverPermission) {

	}

	@Override
	public void sendOrderedBroadcast(Intent intent,  String receiverPermission) {

	}

	@Override
	public void sendOrderedBroadcast( Intent intent,  String receiverPermission,  BroadcastReceiver resultReceiver,  Handler scheduler, int initialCode,  String initialData,  Bundle initialExtras) {

	}

	@Override
	public void sendBroadcastAsUser(Intent intent, UserHandle user) {

	}

	@Override
	public void sendBroadcastAsUser(Intent intent, UserHandle user,  String receiverPermission) {

	}

	@Override
	public void sendOrderedBroadcastAsUser(Intent intent, UserHandle user,  String receiverPermission, BroadcastReceiver resultReceiver,  Handler scheduler, int initialCode,  String initialData,  Bundle initialExtras) {

	}

	@Override
	public void sendStickyBroadcast(Intent intent) {

	}

	@Override
	public void sendStickyOrderedBroadcast(Intent intent, BroadcastReceiver resultReceiver,  Handler scheduler, int initialCode,  String initialData,  Bundle initialExtras) {

	}

	@Override
	public void removeStickyBroadcast(Intent intent) {

	}

	@Override
	public void sendStickyBroadcastAsUser(Intent intent, UserHandle user) {

	}

	@Override
	public void sendStickyOrderedBroadcastAsUser(Intent intent, UserHandle user, BroadcastReceiver resultReceiver,  Handler scheduler, int initialCode,  String initialData,  Bundle initialExtras) {

	}

	@Override
	public void removeStickyBroadcastAsUser(Intent intent, UserHandle user) {

	}


	@Override
	public Intent registerReceiver( BroadcastReceiver receiver, IntentFilter filter) {
		return null;
	}


	@Override
	public Intent registerReceiver( BroadcastReceiver receiver, IntentFilter filter, int flags) {
		return null;
	}


	@Override
	public Intent registerReceiver(BroadcastReceiver receiver, IntentFilter filter,  String broadcastPermission,  Handler scheduler) {
		return null;
	}


	@Override
	public Intent registerReceiver(BroadcastReceiver receiver, IntentFilter filter,  String broadcastPermission,  Handler scheduler, int flags) {
		return null;
	}

	@Override
	public void unregisterReceiver(BroadcastReceiver receiver) {

	}


	@Override
	public ComponentName startService(Intent service) {
		return null;
	}


	@Override
	public ComponentName startForegroundService(Intent service) {
		return null;
	}

	@Override
	public boolean stopService(Intent service) {
		return false;
	}

	@Override
	public boolean bindService(Intent service,  ServiceConnection conn, int flags) {
		return false;
	}

	@Override
	public void unbindService( ServiceConnection conn) {

	}

	@Override
	public boolean startInstrumentation( ComponentName className,  String profileFile,  Bundle arguments) {
		return false;
	}

	@Override
	public Object getSystemService( String name) {
		return null;
	}


	@Override
	public String getSystemServiceName( Class<?> serviceClass) {
		return null;
	}

	@Override
	public int checkPermission( String permission, int pid, int uid) {
		return 0;
	}

	@Override
	public int checkCallingPermission( String permission) {
		return 0;
	}

	@Override
	public int checkCallingOrSelfPermission( String permission) {
		return 0;
	}

	@Override
	public int checkSelfPermission( String permission) {
		return 0;
	}

	@Override
	public void enforcePermission( String permission, int pid, int uid,  String message) {

	}

	@Override
	public void enforceCallingPermission( String permission,  String message) {

	}

	@Override
	public void enforceCallingOrSelfPermission( String permission,  String message) {

	}

	@Override
	public void grantUriPermission(String toPackage, Uri uri, int modeFlags) {

	}

	@Override
	public void revokeUriPermission(Uri uri, int modeFlags) {

	}

	@Override
	public void revokeUriPermission(String toPackage, Uri uri, int modeFlags) {

	}

	@Override
	public int checkUriPermission(Uri uri, int pid, int uid, int modeFlags) {
		return 0;
	}

	@Override
	public int checkCallingUriPermission(Uri uri, int modeFlags) {
		return 0;
	}

	@Override
	public int checkCallingOrSelfUriPermission(Uri uri, int modeFlags) {
		return 0;
	}

	@Override
	public int checkUriPermission( Uri uri,  String readPermission,  String writePermission, int pid, int uid, int modeFlags) {
		return 0;
	}

	@Override
	public void enforceUriPermission(Uri uri, int pid, int uid, int modeFlags, String message) {

	}

	@Override
	public void enforceCallingUriPermission(Uri uri, int modeFlags, String message) {

	}

	@Override
	public void enforceCallingOrSelfUriPermission(Uri uri, int modeFlags, String message) {

	}

	@Override
	public void enforceUriPermission( Uri uri,  String readPermission,  String writePermission, int pid, int uid, int modeFlags,  String message) {

	}

	@Override
	public Context createPackageContext(String packageName, int flags) throws PackageManager.NameNotFoundException {
		return null;
	}

	@Override
	public Context createContextForSplit(String splitName) throws PackageManager.NameNotFoundException {
		return null;
	}

	@Override
	public Context createConfigurationContext( Configuration overrideConfiguration) {
		return null;
	}

	@Override
	public Context createDisplayContext( Display display) {
		return null;
	}

	@Override
	public Context createDeviceProtectedStorageContext() {
		return null;
	}

	@Override
	public boolean isDeviceProtectedStorage() {
		return false;
	}
}
