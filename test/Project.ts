import { expect } from "chai";
import { ethers } from "hardhat";
import { Project } from "../typechain/";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("CrowdFundRaise", function () {

  let proj: Project;
  let sami: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let ana: SignerWithAddress;
  let response;

  this.beforeAll(async function() {
    [sami, alice, bob, ana] = await ethers.getSigners();
    const Project = await ethers.getContractFactory("Project");
    const proj = await Project.connect(sami).deploy(
      sami.address,
      100000000000000000000,
      30,
      10000000000000000,
      1000000000000000000,
      "Sam's NFT",
      "SAMI");
    await proj.deployed();
    console.log("contract address: ", proj.address);
  });

  it("contribute to a project", async function () {
    response = await proj.connect(alice).contribute({value: ethers.utils.parseEther("1.0")});

    const tx = {
      to: proj.address,
      value: ethers.utils.parseEther("1.0")
    }
    
    await bob.sendTransaction(tx);
  });

  it("cancel a project", async function () {
    await proj.connect(sami).cancelProject();
    await proj.connect(alice).cancelProject();
  });

  it("toggle project status", async function () {
    await proj.connect(sami).toggleProjectStatus();
    await proj.connect(alice).toggleProjectStatus();
  });

  it("refund a contributor", async function () {
    response = await proj.connect(alice).refundContributor();
    console.log("refund to alice: ", response);

    response = await proj.connect(ana).refundContributor();
    console.log("refund to ana: ", response);
  });

  it("create spending request", async function () {
    response = await proj.connect(alice).createSpendingRequest(ana.address, 100000000000000000000, "sending to Ana");

    response = await proj.connect(sami).createSpendingRequest(ana.address, 100000000000000000000, "sending to Ana");
    console.log("created spending request: ", response);
  });

  it("vote for a spending request", async function () {
    response = await proj.connect(sami).createSpendingRequest(ana.address, 100000000000000000000, "sending to Ana");
    response = await proj.connect(ana).vote(response._requestID);

    response = await proj.connect(alice).vote(response._requestID);
  });

  it("pay money to an approved spending request", async function () {
    response = await proj.connect(sami).createSpendingRequest(ana.address, 100000000000000000000, "sending to Ana");
    response = await proj.connect(alice).payMoney(response._requestID);
    response = await proj.connect(sami).payMoney(response._requestID);
  });

});
