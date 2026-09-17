(() => {
  'use strict';
  const enc = obj => btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  const dec = code => JSON.parse(decodeURIComponent(escape(atob(String(code||'').trim()))));
  const waitIce = pc => {
    if (pc.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise(resolve => {
      let done = false;
      const finish = () => { if(done) return; done=true; pc.removeEventListener('icegatheringstatechange',check); resolve(); };
      const check = () => { if(pc.iceGatheringState==='complete') finish(); };
      pc.addEventListener('icegatheringstatechange',check);
      setTimeout(finish,4500);
    });
  };
  const makePeer = () => new RTCPeerConnection({iceServers:[]});
  const id = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  class GameBoxLANSession {
    constructor(options={}){
      this.game = options.game || 'gamebox';
      this.onMessage = options.onMessage || (()=>{});
      this.onPeersChanged = options.onPeersChanged || (()=>{});
      this.onStatus = options.onStatus || (()=>{});
      this.role = null;
      this.hostPending = null;
      this.hostPeers = [];
      this.clientPeer = null;
      this.clientChannel = null;
      this.clientId = id();
    }
    status(text){ this.onStatus(text); }
    async createHostOffer(){
      this.role='host';
      const pc=makePeer(), channel=pc.createDataChannel(`gamebox-${this.game}`), peer={id:id(),pc,channel,meta:{}};
      this._wireHostPeer(peer);
      const offer=await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitIce(pc);
      this.hostPending=peer;
      this.status('Invite ready');
      return enc({v:1,game:this.game,description:pc.localDescription});
    }
    async acceptHostAnswer(code){
      if(!this.hostPending) throw new Error('No pending invite');
      const payload=dec(code);
      if(payload.game!==this.game) throw new Error('Invite is for a different game');
      await this.hostPending.pc.setRemoteDescription(payload.description);
      this.hostPeers.push(this.hostPending);
      this.hostPending=null;
      this.status('Connecting');
    }
    async createClientAnswer(code){
      this.role='client';
      const payload=dec(code);
      if(payload.game!==this.game) throw new Error('Invite is for a different game');
      const pc=makePeer(); this.clientPeer=pc;
      pc.ondatachannel=e=>{this.clientChannel=e.channel;this._wireClientChannel(this.clientChannel);};
      await pc.setRemoteDescription(payload.description);
      const answer=await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitIce(pc);
      this.status('Answer ready');
      return enc({v:1,game:this.game,description:pc.localDescription});
    }
    _wireHostPeer(peer){
      peer.channel.onopen=()=>{this.status('Connected');this.onPeersChanged(this.peers());};
      peer.channel.onclose=()=>{this.onPeersChanged(this.peers());};
      peer.channel.onerror=()=>this.status('Connection error');
      peer.channel.onmessage=e=>this._receive(e.data,{role:'host',peer});
    }
    _wireClientChannel(channel){
      channel.onopen=()=>{this.status('Connected');this.onPeersChanged(this.peers());};
      channel.onclose=()=>{this.status('Disconnected');this.onPeersChanged(this.peers());};
      channel.onerror=()=>this.status('Connection error');
      channel.onmessage=e=>this._receive(e.data,{role:'client'});
    }
    _receive(raw,source){
      try{const msg=JSON.parse(raw);this.onMessage(msg,source);}catch(err){console.warn('GameBox LAN message error',err);}
    }
    peers(){
      if(this.role==='host') return this.hostPeers.filter(p=>p.channel?.readyState==='open');
      return this.clientChannel?.readyState==='open'?[{id:'host',channel:this.clientChannel}]:[];
    }
    sendToHost(message){if(this.clientChannel?.readyState==='open')this.clientChannel.send(JSON.stringify(message));}
    sendToPeer(peer,message){if(peer?.channel?.readyState==='open')peer.channel.send(JSON.stringify(message));}
    broadcast(message){if(this.role==='host')this.peers().forEach(p=>this.sendToPeer(p,message));else this.sendToHost(message);}
    close(){
      try{this.hostPending?.pc?.close();}catch{}
      this.hostPeers.forEach(p=>{try{p.pc?.close();}catch{}});
      try{this.clientPeer?.close();}catch{}
      this.hostPending=null;this.hostPeers=[];this.clientPeer=null;this.clientChannel=null;this.role=null;
      this.onPeersChanged([]);
    }
  }
  window.GameBoxLAN={Session:GameBoxLANSession,encode:enc,decode:dec};
})();