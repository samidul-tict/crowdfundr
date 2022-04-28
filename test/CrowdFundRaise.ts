import { expect } from "chai";
import { ethers } from "hardhat";
import { CrowdFundRaise } from "../typechain/";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Crowd Fund Raise", function () {

  let cfr: CrowdFundRaise;
  let sami: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let response;

  this.beforeAll(async function() {
    [sami, alice, bob] = await ethers.getSigners();
    const CrowdFundRaise = await ethers.getContractFactory("CrowdFundRaise");
    cfr = (await CrowdFundRaise.connect(sami).deploy()) as CrowdFundRaise;
    await cfr.deployed();
    console.log("contract address: ", cfr.address);
  });

  it("create new project for alice", async function () {
    response = await cfr.connect(alice).createProject(
      30,
      ethers.utils.parseEther("100.0"),
      ethers.utils.parseEther("0.01"),
      ethers.utils.parseEther("1.0"),
      "Alice in Wonderland",
      "ALICE");
    // console.log("alice proj address: ", response);
  });

  it("create new project for bob", async function () {
    response = await cfr.connect(bob).createProject(
      30,
      ethers.utils.parseEther("50.0"),
      ethers.utils.parseEther("0.005"),
      ethers.utils.parseEther("1.0"),
      "Bob in Wasteland",
      "BOB");
    // console.log("bob proj address: ", response);
  });

});
