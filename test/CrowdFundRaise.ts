import { expect } from "chai";
import { ethers } from "hardhat";
import { CrowdFundRaise } from "../typechain/";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("CrowdFundRaise", function () {

  let cfr: CrowdFundRaise;
  let sami: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let response;

  this.beforeAll(async function() {
    [sami, alice, bob] = await ethers.getSigners();
    const CrowdFundRaise = await ethers.getContractFactory("CrowdFundRaise");
    const cfr = await CrowdFundRaise.connect(sami).deploy();
    await cfr.deployed();
    console.log("contract address: ", cfr.address);
  });

  it("create new project for alice", async function () {
    response = await cfr.connect(alice).createProject(
      100000000000000000000,
      30,
      10000000000000000,
      1000000000000000000,
      "Alice in Wonderland",
      "ALICE");
    console.log("alice proj address: ", response);
  });

  it("create new project for bob", async function () {
    response = await cfr.connect(bob).createProject(
      50000000000000000000,
      10,
      5000000000000000,
      5000000000000000000,
      "Bob",
      "BOB");
    console.log("bob proj address: ", response);
  });

});
